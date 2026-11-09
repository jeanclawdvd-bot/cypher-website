import {describe,it,expect,vi,beforeAll,afterAll} from 'vitest';
import {createHash,webcrypto} from 'node:crypto';
import {createMediaHandler} from '../../worker/deployment-media';
const data=new TextEncoder().encode('reviewed image');
const hash=createHash('sha256').update(data).digest('hex');
const path='/images/marketplace/example.webp';
const manifest={[path]:{sha256:hash,bytes:data.length,type:'image/webp'}};
const handler=createMediaHandler(manifest);
function setup(){const objects=new Map();return {BUCKET:{head:vi.fn(async(key:string)=>objects.get(key)??null),put:vi.fn(async(key:string,value:Uint8Array)=>{objects.set(key,{body:value,size:value.length});return objects.get(key);}),get:vi.fn(async(key:string)=>objects.get(key)??null)} as unknown as R2Bucket,MEDIA_UPLOAD_TOKEN:'test-secret',MEDIA_UPLOAD_EXPIRES:String(Date.now()+60000)};}
function upload(body:Uint8Array=data,token='test-secret',key=hash){return new Request(`https://example.test/_deployment/media/${key}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Length':String(data.length)},body:body as Uint8Array<ArrayBuffer>});}
describe('reviewed deployment media',()=>{
  beforeAll(()=>vi.stubGlobal('crypto',webcrypto));
  afterAll(()=>vi.unstubAllGlobals());
  it('falls through locally when no bucket is bound',async()=>{expect(await handler(new Request('https://example.test'+path),{})).toBeNull();});
  it('requires a valid temporary secret and upload window',async()=>{const env=setup();expect((await handler(upload(data,'bad'),env))?.status).toBe(401);expect((await handler(upload(),{...env,MEDIA_UPLOAD_EXPIRES:'0'}))?.status).toBe(404);expect((await handler(upload(),{...env,MEDIA_UPLOAD_TOKEN:undefined}))?.status).toBe(404);expect(env.BUCKET.put).not.toHaveBeenCalled();});
  it('rejects arbitrary keys and content that does not match the approved hash',async()=>{const env=setup();expect((await handler(upload(data,'test-secret','arbitrary'),env))?.status).toBe(404);expect((await handler(upload(new Uint8Array(data.length)),env))?.status).toBe(400);expect(env.BUCKET.put).not.toHaveBeenCalled();});
  it('bounds the actual body, even with a false length header',async()=>{const env=setup();expect((await handler(upload(new Uint8Array(1024)),env))?.status).toBe(413);expect(env.BUCKET.put).not.toHaveBeenCalled();});
  it('uploads the exact bytes once and serves public GET and HEAD with ETags',async()=>{const env=setup();expect((await handler(upload(),env))?.status).toBe(204);expect((await handler(upload(),env))?.status).toBe(204);expect(env.BUCKET.put).toHaveBeenCalledTimes(1);const res=await handler(new Request('https://example.test'+path),env);expect(res?.headers.get('Content-Type')).toBe('image/webp');expect(await res?.text()).toBe('reviewed image');expect((await handler(new Request('https://example.test'+path,{headers:{'If-None-Match':`"${hash}"`}}),env))?.status).toBe(304);expect(await (await handler(new Request('https://example.test'+path,{method:'HEAD'}),env))?.text()).toBe('');});
  it('does not expose arbitrary bucket objects or permit public writes',async()=>{const env=setup();expect(await handler(new Request('https://example.test/private'),env)).toBeNull();expect((await handler(new Request('https://example.test'+path,{method:'POST'}),env))?.status).toBe(405);});
  it('never caches missing assets during the upload',async()=>{const res=await handler(new Request('https://example.test'+path),setup());expect(res?.status).toBe(404);expect(res?.headers.get('Cache-Control')).toBe('no-store');});
});
