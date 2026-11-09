import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const removed=new Set(JSON.parse(readFileSync(path.join(root,'scripts/deployment-assets.json'),'utf8')).remove.map(x=>x.url));
const files={};
function visit(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else if(entry.isFile()){
  const url='/'+path.relative(path.join(root,'public'),file).split(path.sep).join('/');
  if(removed.has(url))continue;
  const type={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'}[path.extname(file).toLowerCase()];
  if(!type)throw new Error('Unsupported media: '+url);
  const bytes=statSync(file).size;if(bytes>16*1024*1024)throw new Error('Media too large: '+url);
  files[url]={sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),bytes,type};
}}}
visit(path.join(root,'public/images/marketplace'));
writeFileSync(path.join(root,'worker/deployment-media.json'),JSON.stringify(files,null,2)+'\n');
console.log(JSON.stringify({images:Object.keys(files).length,bytes:Object.values(files).reduce((n,x)=>n+x.bytes,0)}));
