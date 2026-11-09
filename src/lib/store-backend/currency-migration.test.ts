import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';

const migration=(name:string)=>readFileSync(`migrations/store/${name}`,'utf8');

describe('currency migration through the actual D1 SQL splitter',()=>{
  it('preserves legacy records and review references while installing complete nested-CASE triggers',()=>{
    const database=new DatabaseSync(':memory:');
    try{
      database.exec(migration('0001_local_store.sql'));
      database.exec(`
        INSERT INTO store_users(id,email,display_name,password_salt,password_hash,created_at) VALUES
          ('seller','seller@test.invalid','Seller','salt','hash','2026-11-01'),
          ('buyer','buyer@test.invalid','Buyer','salt','hash','2026-11-01');
        INSERT INTO store_items(id,owner_id,product_id,variant_id,name,variant_name,source,acquired_at,created_at) VALUES
          ('old-item','seller','product','silver','Item','Silver','local_seed','2026-11-01','2026-11-01'),
          ('active-item','seller','product','gold','Item','Gold','local_seed','2026-11-01','2026-11-01');
        INSERT INTO store_listings(id,item_id,seller_id,price_cents,created_at) VALUES
          ('old-listing','old-item','seller',12345,'2026-11-01'),
          ('active-listing','active-item','seller',20000,'2026-11-01');
        INSERT INTO store_sales(id,listing_id,item_id,product_id,variant_id,buyer_id,seller_id,price_cents,currency,idempotency_key,request_fingerprint,created_at)
          VALUES('old-sale','old-listing','old-item','product','silver','buyer','seller',12345,'USD','old-key','old-fingerprint','2026-11-02');
        INSERT INTO store_reviews(id,user_id,product_id,variant_id,rating,title,body,created_at,ownership_at_submission,local_purchase_id)
          VALUES('old-review','buyer','product','silver',4,'Original review','Original review body','2026-11-02',1,'old-sale');
      `);
      database.exec(migration('0002_local_reviews.sql'));
      database.exec(migration('0003_local_marketplace_fees.sql'));
      // Wrangler/esbuild requires native typed arrays; use a Node subprocess
      // rather than the jsdom realm used by this repository's Vitest setup.
      const statements:string[]=JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','--input-type=module','-e',"import {readFileSync} from 'node:fs';import {unstable_splitSqlQuery} from 'wrangler';process.stdout.write(JSON.stringify(unstable_splitSqlQuery(readFileSync(0,'utf8'))));"],{input:migration('0004_local_wild_currency.sql'),encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},timeout:20000}));
      database.exec('BEGIN IMMEDIATE');
      try{
        // D1 prepares each Wrangler-split statement independently. Executing the
        // whole SQL file would hide a prematurely split nested CASE trigger.
        for(const statement of statements)database.prepare(statement).run();
        database.exec('COMMIT');
      }catch(error){database.exec('ROLLBACK');throw error;}
      expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(database.prepare("SELECT currency,price_cents,amount_atomic,seller_fee_atomic,seller_proceeds_atomic,fee_policy_version,status FROM store_listings WHERE id='active-listing'").get()).toMatchObject({currency:'USD',price_cents:20000,amount_atomic:'20000',seller_fee_atomic:'0',seller_proceeds_atomic:'20000',fee_policy_version:'legacy-zero',status:'active'});
      expect(database.prepare("SELECT currency,price_cents,amount_atomic,payment_currency,payment_amount_atomic,quote_id,seller_fee_atomic,seller_proceeds_atomic FROM store_sales WHERE id='old-sale'").get()).toMatchObject({currency:'USD',price_cents:12345,amount_atomic:'12345',payment_currency:'USD',payment_amount_atomic:'12345',quote_id:null,seller_fee_atomic:'0',seller_proceeds_atomic:'12345'});
      expect(database.prepare("SELECT local_purchase_id FROM store_reviews WHERE id='old-review'").get()?.local_purchase_id).toBe('old-sale');
      expect(database.prepare("SELECT owner_id FROM store_items WHERE id='old-item'").get()?.owner_id).toBe('buyer');
      database.exec("UPDATE store_listings SET status='cancelled',closed_at='2026-11-08' WHERE id='active-listing'");
      const listing=database.prepare(`INSERT INTO store_listings(id,item_id,seller_id,currency,amount_atomic,created_at,fee_policy_version,seller_fee_bps,seller_fee_atomic,seller_proceeds_atomic) VALUES('new-listing','active-item','seller','WILD','12350','2026-11-08','2026-11-08-seller-1pct',100,?,?)`);
      expect(()=>listing.run('0','12350')).toThrow(/listing_fee_invalid/);
      listing.run('124','12226');
      expect(()=>database.prepare("UPDATE store_listings SET amount_atomic='1' WHERE id='new-listing'").run()).toThrow(/listing_immutable/);
      expect(database.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('store_listing_fee_valid','store_quote_valid','store_sale_quote_matches')").all()).toHaveLength(3);
    }finally{database.close();}
  });
});
