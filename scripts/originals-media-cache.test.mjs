import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import {parameters,thumbnail} from './originals-media-cache.mjs';
const key='Qm'+'a'.repeat(44);
test('cache resizes once, coalesces requests, preserves pixels and reuses immutable disk rendition',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'ww-originals-media-'));
 try {
  const source=await sharp({create:{width:1280,height:640,channels:3,background:'#507080'}}).png().toBuffer();
  let calls=0;const readSource=async()=>{calls++;return source;};
  const [a,b]=await Promise.all([thumbnail(key,320,{directory,readSource}),thumbnail(key,320,{directory,readSource})]);
  assert.equal(calls,1);assert.deepEqual(a.bytes,b.bytes);assert.equal((await sharp(a.bytes).metadata()).width,320);assert.equal((await sharp(a.bytes).metadata()).height,160);
  const next=await thumbnail(key,320,{directory,readSource});assert.equal(calls,1);assert.equal(next.cached,true);assert.equal(next.etag,a.etag);
 } finally {await rm(directory,{recursive:true,force:true});}
});
test('helper rejects URL proxy, traversal, invalid width and duplicate parameters',()=>{
 for(const query of ['cid=http://127.0.0.1/secret',`cid=${key}/..`,`cid=${key}%2F%2e%2e`,`cid=${key}&w=4000`,`cid=${key}&cid=${key}`,`cid=${key}&url=https://evil.test`])assert.equal(parameters(new URL(`http://localhost/media?${query}`)),null);
 assert.deepEqual(parameters(new URL(`http://localhost/media?cid=${key}%2Fimage.png&w=640`)),{key:key+'/image.png',width:640});
});
