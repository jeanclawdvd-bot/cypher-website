import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Only a fixed immutable IPFS gateway. No URL input, redirects, credentials or external bindings.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = resolve(root,'.tmp/originals-thumbnails');
const inflight = new Map();
let running = 0;
const queue = [];
const MAX_BYTES = 20 * 1024 * 1024;
const LIMIT = 1_000_000_000;
let cachedBytes = 0;
export function parameters(url) {
  if (url.pathname !== '/media' || [...url.searchParams.keys()].some(key=>!['cid','w'].includes(key)) || url.searchParams.getAll('cid').length!==1 || url.searchParams.getAll('w').length>1) return null;
  const key=url.searchParams.get('cid')??'',width=url.searchParams.get('w')??'640';
  const [cid,...parts]=key.split('/');
  if(key.length>512 || !/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/.test(cid) || parts.some(part=>!/^[A-Za-z0-9._~-]{1,160}$/.test(part)||part==='.'||part==='..') || !/^(320|640|1280)$/.test(width)) return null;
  return {key,width:Number(width)};
}
async function limited(job) {
  if(running>=3) {
    if(queue.length>=100) throw new Error('queue_full');
    await new Promise(resolve=>queue.push(resolve));
  }
  running++;
  try {return await job();} finally {running--;queue.shift()?.();}
}
async function sourceImage(key) {
  const response=await fetch(`https://ipfs.filebase.io/ipfs/${key}`,{headers:{Accept:'image/png,image/jpeg,image/webp'},redirect:'error',signal:AbortSignal.timeout(55_000)});
  if(!response.ok || !/^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type')??'') || Number(response.headers.get('content-length')??0)>MAX_BYTES) throw new Error('source_unavailable');
  const reader=response.body?.getReader(); if(!reader) throw new Error('source_empty');
  const chunks=[];let size=0;
  try {for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new Error('source_too_large');}chunks.push(next.value);}}finally{reader.releaseLock();}
  return Buffer.concat(chunks);
}
export async function thumbnail(key,width,{readSource=sourceImage,directory=cache}={}) {
  const hash=createHash('sha256').update(`v1:${key}:${width}`).digest('hex'), filename=resolve(directory,`${hash}.webp`);
  try {return {bytes:await readFile(filename),etag:`"${hash}"`,cached:true};}catch(error){if(error.code!=='ENOENT')throw error;}
  const cacheKey=filename;
  if(!inflight.has(cacheKey)) inflight.set(cacheKey,limited(async()=>{
    const bytes=await sharp(await readSource(key),{limitInputPixels:40_000_000,animated:false}).rotate().resize({width,withoutEnlargement:true}).webp({quality:83,effort:4}).toBuffer();
    if(cachedBytes+bytes.length>LIMIT) throw new Error('cache_capacity');
    await mkdir(directory,{recursive:true});
    const temporary=filename+`.${process.pid}.tmp`;
    try {await writeFile(temporary,bytes,{flag:'wx'});await rename(temporary,filename);} finally {await unlink(temporary).catch(()=>{});}
    cachedBytes+=bytes.length;
    return {bytes,etag:`"${hash}"`,cached:false};
  }).finally(()=>inflight.delete(cacheKey)));
  return inflight.get(cacheKey);
}
export function createMediaServer() {
  return createServer(async(req,res)=>{
    if(!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress)|| !['127.0.0.1:8793','localhost:8793'].includes(req.headers.host??'')){res.writeHead(403).end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    // Same-origin workers do not forward browser Origin/Cookie. Never accept cross-site browser requests.
    if(req.headers.origin || req.headers.cookie){res.writeHead(403).end();return;}
    const parsed=parameters(new URL(req.url,'http://127.0.0.1:8793'));
    if(!parsed){res.writeHead(400).end();return;}
    try {
      const result=await thumbnail(parsed.key,parsed.width);
      const headers={'Content-Type':'image/webp','Cache-Control':'public,max-age=31536000,immutable',ETag:result.etag,'X-Content-Type-Options':'nosniff','X-Original-CID':parsed.key,'X-Thumbnail-Cache':result.cached?'hit':'miss','Content-Length':result.bytes.length};
      if(req.headers['if-none-match']===result.etag){delete headers['Content-Length'];res.writeHead(304,headers).end();return;}
      res.writeHead(200,headers).end(req.method==='HEAD'?undefined:result.bytes);
    }catch{res.writeHead(502,{'Cache-Control':'no-store'}).end('Artwork temporarily unavailable');}
  });
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  await mkdir(cache,{recursive:true});
  const {readdir}=await import('node:fs/promises');
  cachedBytes=(await Promise.all((await readdir(cache)).filter(name=>/^[a-f0-9]{64}\.webp$/.test(name)).map(async name=>(await stat(resolve(cache,name))).size))).reduce((a,b)=>a+b,0);
  createMediaServer().listen(8793,'127.0.0.1',()=>console.log('Originals thumbnail cache listening on http://127.0.0.1:8793 (local only).'));
}
