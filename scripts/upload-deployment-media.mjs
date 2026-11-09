import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Receive the temporary token only over hidden stdin, never arguments or files.
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for media upload JSON on stdin (input is hidden).');
let input='';
for await(const chunk of process.stdin){input+=chunk;if(/[\r\n]/.test(input))break;}
if(process.stdin.isTTY)process.stdin.setRawMode(false);
const {origin,token,verifyOnly=false}=JSON.parse(input.trim());
const base=new URL(origin);if(base.protocol!=='https:'||!base.hostname.endsWith('.chatgpt.site'))throw new Error('Expected a Sites HTTPS origin');
const manifest=JSON.parse(await readFile(path.join(root,'worker/deployment-media.json'),'utf8'));
const entries=[...new Map(Object.entries(manifest).map(([url,entry])=>[entry.sha256,{url,...entry}])).values()];
console.log(JSON.stringify({starting:true,total:entries.length}));
let index=0,done=0;const failures=[];
async function run(){while(index<entries.length){const item=entries[index++];try{
  const file=path.resolve(root,'public','.'+item.url);
  if(!file.startsWith(path.resolve(root,'public')+path.sep))throw new Error('Unsafe source path');
  const bytes=await readFile(file);
  if(createHash('sha256').update(bytes).digest('hex')!==item.sha256||bytes.length!==item.bytes)throw new Error('Source changed');
  let succeeded=false,last='';
  for(let attempt=0;attempt<4;attempt++){
    try{
      if(!verifyOnly){const response=await fetch(new URL('/_deployment/media/'+item.sha256,base),{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':item.type,'Content-Length':String(bytes.length)},body:bytes,signal:AbortSignal.timeout(45000)});if(response.status!==204)throw new Error('Upload HTTP '+response.status);}
      const response=await fetch(new URL(item.url,base),{method:'HEAD',signal:AbortSignal.timeout(20000)});
      if(response.status!==200||response.headers.get('etag')!==`"${item.sha256}"`||Number(response.headers.get('content-length'))!==item.bytes)throw new Error('Readback mismatch HTTP '+response.status);
      succeeded=true;break;
    }catch(error){last=error.message;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}
  }
  if(!succeeded)throw new Error(last);
}catch(error){failures.push({url:item.url,error:error.message});}finally{done++;if(done%100===0||done===entries.length)console.log(JSON.stringify({verified:done-failures.length,checked:done,total:entries.length,failed:failures.length}));}}}
await Promise.all(Array.from({length:6},run));
if(failures.length){console.log(JSON.stringify({failures}));process.exitCode=1;}else console.log(JSON.stringify({complete:true,verified:done,publicImageUrls:Object.keys(manifest).length}));
process.exit(process.exitCode??0);
