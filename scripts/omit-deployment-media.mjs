import {readFileSync,existsSync,realpathSync,lstatSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),client=realpathSync(path.join(root,'dist/client'));
const manifest=JSON.parse(readFileSync(path.join(root,'worker/deployment-media.json'),'utf8'));
const files=[];
for(const [url,entry] of Object.entries(manifest)){
  if(!url.startsWith('/images/marketplace/')||url.includes('..')||url.includes('\\'))throw new Error('Unsafe media URL');
  const file=path.resolve(client,'.'+url);
  if(!file.startsWith(client+path.sep))throw new Error('Unsafe media path');
  if(!existsSync(file))continue;
  const stat=lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||!realpathSync(file).startsWith(client+path.sep))throw new Error('Unsafe build file');
  if(stat.size!==entry.bytes||createHash('sha256').update(readFileSync(file)).digest('hex')!==entry.sha256)throw new Error('Media manifest needs refresh: '+url);
  files.push(file);
}
for(const file of files)unlinkSync(file);
console.log(JSON.stringify({hostedMediaCopiesRemoved:files.length,sourceOriginalsPreserved:true}));
