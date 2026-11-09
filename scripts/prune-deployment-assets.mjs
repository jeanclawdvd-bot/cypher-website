import {readFileSync, existsSync, realpathSync, lstatSync, unlinkSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Deployment packaging only. public/ remains the complete source archive.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client=realpathSync(path.join(root,'dist/client'));
const manifest=JSON.parse(readFileSync(path.join(root,'scripts/deployment-assets.json'),'utf8'));
const aliases=JSON.parse(readFileSync(path.join(root,'worker/optimized-assets.json'),'utf8'));
function target(url){
  if(!url.startsWith('/')||url.includes('..')||url.includes('\\'))throw new Error('Invalid asset path');
  const result=path.resolve(client,'.'+url);
  if(!result.startsWith(client+path.sep))throw new Error('Asset escapes build output');
  return result;
}
function validateRequired(){
  for(const url of manifest.required){
    const file=target(aliases[url]??url);
    if(!existsSync(file)||!lstatSync(file).isFile())throw new Error('Required deployed image missing: '+url);
  }
  for(const [url,original] of Object.entries(aliases)){
    if(!existsSync(target(original)))throw new Error('Image alias target missing: '+url);
  }
}
validateRequired();
const removals=[];
for(const item of manifest.remove){
  const file=target(item.url);
  if(!existsSync(file))continue;
  const stat=lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||!realpathSync(file).startsWith(client+path.sep))throw new Error('Unsafe deployment asset: '+item.url);
  if(createHash('sha256').update(readFileSync(file)).digest('hex')!==item.sha256)throw new Error('Asset changed since review; refresh manifest: '+item.url);
  removals.push({file,bytes:stat.size});
}
for(const item of removals)unlinkSync(item.file);
validateRequired();
console.log(JSON.stringify({removedDeploymentCopies:removals.length,bytesSaved:removals.reduce((sum,item)=>sum+item.bytes,0),requiredImagesVerified:manifest.required.length,sourceOriginalsPreserved:true}));
