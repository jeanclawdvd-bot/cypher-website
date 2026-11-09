/** Node-only LOCAL persistence. Not imported by browser/Cloudflare routes.
 * No production adapter, payment operation, signing key or mint operation exists here.
 */
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {CollectionFulfillment,type FulfillmentRepository,type FulfillmentTransaction,type Order} from './fulfillment';

const SCHEMA=`
CREATE TABLE IF NOT EXISTS fulfillment_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT OR IGNORE INTO fulfillment_meta VALUES ('mode','local-only-v1');
CREATE TABLE IF NOT EXISTS fulfillment_orders (
 id TEXT PRIMARY KEY,order_json TEXT NOT NULL CHECK(json_valid(order_json)),revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS fulfillment_claims (
 evidence_key TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES fulfillment_orders(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS fulfillment_outbox (
 order_id TEXT PRIMARY KEY REFERENCES fulfillment_orders(id),
 status TEXT NOT NULL CHECK(status IN ('pending','leased','done','dead')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_run_at INTEGER NOT NULL,lease_token TEXT,lease_owner TEXT,lease_until INTEGER,
 dirty INTEGER NOT NULL DEFAULT 0 CHECK(dirty IN (0,1)),last_error TEXT,
 CHECK((status='leased' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR
       (status!='leased' AND lease_token IS NULL AND lease_until IS NULL))
);
CREATE INDEX IF NOT EXISTS fulfillment_due ON fulfillment_outbox(status,next_run_at,lease_until);
`;
type JobRow={order_id:string;status:'pending'|'leased'|'done'|'dead';attempts:number;next_run_at:number;lease_token:string|null;lease_owner:string|null;lease_until:number|null;dirty:number;last_error:string|null};
export type FulfillmentJob={orderId:string;status:JobRow['status'];attempts:number;nextRunAt:number;leaseToken:string|null;leaseOwner:string|null;leaseUntil:number|null;dirty:boolean;lastError:string|null};
export type ClaimedFulfillmentJob=FulfillmentJob&{leaseToken:string;leaseUntil:number};
function mapJob(row:JobRow):FulfillmentJob{return {orderId:row.order_id,status:row.status,attempts:row.attempts,nextRunAt:row.next_run_at,leaseToken:row.lease_token,leaseOwner:row.lease_owner,leaseUntil:row.lease_until,dirty:row.dirty===1,lastError:row.last_error};}
function bounded(value:number,min:number,max:number,name:string){if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(`Invalid ${name}`);return value;}
function text(value:string,max=512){if(!value.trim()||value.length>max)throw Error('Invalid persistence identity');return value;}

/** Separate SQLite file; the local-account database does not establish fulfillment authority. */
export class SqliteFulfillmentRepository implements FulfillmentRepository {
 private database:DatabaseSync;
 private inTransaction=false;
 constructor(filename:string,private options:{mode:'local';now?:()=>number}){
  if(options.mode!=='local')throw Error('Durable fulfillment is local-only');
  this.database=new DatabaseSync(filename);
  this.database.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=2000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
  this.database.exec(SCHEMA);
  if(this.database.prepare("SELECT value FROM fulfillment_meta WHERE key='mode'").get()?.value!=='local-only-v1')throw Error('Unsupported fulfillment database');
 }
 private now(){return bounded((this.options.now??Date.now)(),0,Number.MAX_SAFE_INTEGER,'clock');}
 private atomic<T>(action:()=>T):T {
  if(this.inTransaction)throw Error('Nested fulfillment transactions are not supported');
  this.database.exec('BEGIN IMMEDIATE');this.inTransaction=true;
  try{
   const result=action();
   if(result&&typeof (result as {then?:unknown}).then==='function'){
    // SQLite transactions must never stay open while waiting on a network adapter.
    void Promise.resolve(result).catch(()=>undefined);
    throw Error('Fulfillment transaction callbacks must be synchronous');
   }
   this.database.exec('COMMIT');return structuredClone(result);
  }catch(error){this.database.exec('ROLLBACK');throw error;}finally{this.inTransaction=false;}
 }
 async transaction<T>(action:(tx:FulfillmentTransaction)=>T|Promise<T>):Promise<T>{
  return this.atomic(()=>{
   let active=true;
   const guard=()=>{if(!active||!this.inTransaction)throw Error('Fulfillment transaction is closed');};
   try{return action({
   get:id=>{
    guard();
    const row=this.database.prepare('SELECT order_json FROM fulfillment_orders WHERE id=?').get(text(id));
    return row?JSON.parse(String(row.order_json)) as Order:undefined;
   },
   put:order=>{
    guard();
    const serialized=JSON.stringify(order);if(serialized.length>65536)throw Error('Order exceeds persistence limit');
    this.database.prepare('INSERT INTO fulfillment_orders(id,order_json) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET order_json=excluded.order_json,revision=fulfillment_orders.revision+1').run(text(order.id),serialized);
   },
   claim:(key,orderId)=>{
    guard();
    this.database.prepare('INSERT OR IGNORE INTO fulfillment_claims(evidence_key,order_id) VALUES (?,?)').run(text(key),text(orderId));
    return this.database.prepare('SELECT order_id FROM fulfillment_claims WHERE evidence_key=?').get(key)?.order_id===orderId;
   },
   enqueueReconciliation:orderId=>{guard();this.enqueue(orderId);},
  });}finally{active=false;}
  }) as T;
 }
 private enqueue(orderId:string){
  this.database.prepare(`INSERT INTO fulfillment_outbox(order_id,status,next_run_at) VALUES (?,'pending',?)
   ON CONFLICT(order_id) DO UPDATE SET
    status=CASE WHEN fulfillment_outbox.status IN ('done','dead') THEN 'pending' ELSE fulfillment_outbox.status END,
    attempts=CASE WHEN fulfillment_outbox.status IN ('done','dead') THEN 0 ELSE fulfillment_outbox.attempts END,
    next_run_at=MIN(fulfillment_outbox.next_run_at,excluded.next_run_at),
    dirty=CASE WHEN fulfillment_outbox.status='leased' THEN 1 ELSE fulfillment_outbox.dirty END`).run(text(orderId),this.now());
 }
 async schedule(orderId:string){return this.transaction(tx=>{if(!tx.get(orderId))throw Error('Unknown order');tx.enqueueReconciliation!(orderId);});}
 claimNext(workerId:string,leaseMs=30000,maxAttempts=6):ClaimedFulfillmentJob|null {
  text(workerId,128);bounded(leaseMs,100,120000,'lease');bounded(maxAttempts,1,20,'max attempts');
  return this.atomic(()=>{
   const now=this.now();
   this.database.prepare(`UPDATE fulfillment_outbox SET status='dead',lease_token=NULL,lease_owner=NULL,lease_until=NULL,last_error='Worker lease expired at retry limit' WHERE status='leased' AND lease_until<=? AND attempts>=?`).run(now,maxAttempts);
   const row=this.database.prepare(`SELECT * FROM fulfillment_outbox WHERE attempts<? AND
    ((status='pending' AND next_run_at<=?) OR (status='leased' AND lease_until<=?)) ORDER BY next_run_at,order_id LIMIT 1`).get(maxAttempts,now,now) as JobRow|undefined;
   if(!row)return null;
   const leaseToken=randomUUID();
   this.database.prepare(`UPDATE fulfillment_outbox SET status='leased',attempts=attempts+1,lease_token=?,lease_owner=?,lease_until=?,dirty=0 WHERE order_id=?`).run(leaseToken,workerId,now+leaseMs,row.order_id);
   return mapJob(this.database.prepare('SELECT * FROM fulfillment_outbox WHERE order_id=?').get(row.order_id) as JobRow) as ClaimedFulfillmentJob;
  });
 }
 complete(job:ClaimedFulfillmentJob,reconcileAfterMs:number|null):boolean {
  if(reconcileAfterMs!==null)bounded(reconcileAfterMs,1000,86400000,'reconciliation interval');
  return this.atomic(()=>{
   const now=this.now();
   const row=this.database.prepare(`SELECT * FROM fulfillment_outbox WHERE order_id=? AND status='leased' AND lease_token=? AND lease_until>?`).get(job.orderId,job.leaseToken,now) as JobRow|undefined;
   if(!row)return false;
   const repeat=row.dirty===1||reconcileAfterMs!==null;
   this.database.prepare(`UPDATE fulfillment_outbox SET status=?,attempts=0,next_run_at=?,lease_token=NULL,lease_owner=NULL,lease_until=NULL,dirty=0,last_error=NULL WHERE order_id=?`).run(repeat?'pending':'done',row.dirty?now:now+(reconcileAfterMs??0),job.orderId);
   return true;
  });
 }
 fail(job:ClaimedFulfillmentJob,maxAttempts=6,baseRetryMs=1000,maxRetryMs=60000):boolean {
  bounded(maxAttempts,1,20,'max attempts');bounded(baseRetryMs,100,60000,'retry delay');bounded(maxRetryMs,baseRetryMs,3600000,'retry ceiling');
  return this.atomic(()=>{
   const now=this.now();
   const row=this.database.prepare(`SELECT * FROM fulfillment_outbox WHERE order_id=? AND status='leased' AND lease_token=? AND lease_until>?`).get(job.orderId,job.leaseToken,now) as JobRow|undefined;
   if(!row)return false;
   const delay=Math.min(maxRetryMs,baseRetryMs*2**(row.attempts-1));
   this.database.prepare(`UPDATE fulfillment_outbox SET status=?,next_run_at=?,lease_token=NULL,lease_owner=NULL,lease_until=NULL,dirty=0,last_error='Reconciliation failed; inspect authenticated adapter logs' WHERE order_id=?`).run(row.attempts>=maxAttempts?'dead':'pending',row.dirty?now:now+delay,job.orderId);
   return true;
  });
 }
 jobs(limit=100){bounded(limit,1,500,'job limit');return (this.database.prepare('SELECT * FROM fulfillment_outbox ORDER BY next_run_at,order_id LIMIT ?').all(limit) as JobRow[]).map(mapJob);}
 close(){if(this.inTransaction)throw Error('Cannot close during transaction');this.database.close();}
}

/** Explicitly invoked local worker. It has no timer, public route or live adapter. */
export class LocalFulfillmentWorker {
 constructor(private repository:SqliteFulfillmentRepository,private service:CollectionFulfillment,
  private options:{mode:'local';workerId:string;leaseMs?:number;maxAttempts?:number;reconcileAfterMs?:number;retryMs?:number}){
  if(options.mode!=='local')throw Error('Fulfillment worker is local-only');
  text(options.workerId,128);
  bounded(options.leaseMs??30000,100,120000,'lease');bounded(options.maxAttempts??6,1,20,'max attempts');
  bounded(options.reconcileAfterMs??60000,1000,86400000,'reconciliation interval');bounded(options.retryMs??1000,100,60000,'retry delay');
 }
 async processOne():Promise<{status:'idle'|'completed'|'retry'|'dead'|'lease_lost';orderId?:string}>{
  const job=this.repository.claimNext(this.options.workerId,this.options.leaseMs,this.options.maxAttempts);
  if(!job)return {status:'idle'};
  try{
   const order=await this.service.reconcile(job.orderId);
   if(order.delivery!=='delivered'&&order.delivery!=='revoked')throw Error('Reconciliation incomplete');
   const accepted=this.repository.complete(job,order.delivery==='delivered'?(this.options.reconcileAfterMs??60000):null);
   return {status:accepted?'completed':'lease_lost',orderId:job.orderId};
  }catch{
   const accepted=this.repository.fail(job,this.options.maxAttempts,this.options.retryMs);
   return {status:accepted?(job.attempts>=(this.options.maxAttempts??6)?'dead':'retry'):'lease_lost',orderId:job.orderId};
  }
 }
 async runBatch(limit=10){bounded(limit,1,20,'batch limit');const results=[];for(let i=0;i<limit;i++){const result=await this.processOne();results.push(result);if(result.status==='idle')break;}return results;}
}
