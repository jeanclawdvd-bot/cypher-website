export type MediaEntry={sha256:string;bytes:number;type:string};
export type MediaManifest=Record<string,MediaEntry>;
type MediaEnv={BUCKET?:R2Bucket;MEDIA_UPLOAD_TOKEN?:string;MEDIA_UPLOAD_EXPIRES?:string};
const noStore={'Cache-Control':'no-store'};
const reply=(status:number)=>new Response(null,{status,headers:noStore});
const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))).map(b=>b.toString(16).padStart(2,'0')).join('');

/** Only immutable, reviewed public images can be uploaded. No user files or arbitrary keys. */
export function createMediaHandler(manifest:MediaManifest){
  const byHash=new Map(Object.values(manifest).map(item=>[item.sha256,item]));
  return async(request:Request,env:MediaEnv,pathname=new URL(request.url).pathname):Promise<Response|null>=>{
    if(pathname.startsWith('/_deployment/media/')){
      if(!env.BUCKET||!env.MEDIA_UPLOAD_TOKEN||!Number.isFinite(Number(env.MEDIA_UPLOAD_EXPIRES))||Date.now()>=Number(env.MEDIA_UPLOAD_EXPIRES))return reply(404);
      if(request.headers.get('Authorization')!==`Bearer ${env.MEDIA_UPLOAD_TOKEN}`)return reply(401);
      if(request.method!=='PUT')return reply(405);
      const hash=pathname.slice('/_deployment/media/'.length),entry=byHash.get(hash);
      if(!entry)return reply(404);
      if(Number(request.headers.get('Content-Length'))!==entry.bytes||!request.body)return reply(400);
      // Bound the actual stream too; Content-Length is not trusted.
      const bytes=new Uint8Array(entry.bytes),reader=request.body.getReader();let length=0;
      for(;;){const {done,value}=await reader.read();if(done)break;if(length+value.length>bytes.length){await reader.cancel();return reply(413);}bytes.set(value,length);length+=value.length;}
      if(length!==entry.bytes||await digest(bytes)!==hash)return reply(400);
      const key=`media/${hash}`;
      if(!await env.BUCKET.head(key))await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:entry.type},customMetadata:{sha256:hash}});
      return reply(204);
    }
    if(!env.BUCKET||!Object.hasOwn(manifest,pathname))return null;
    if(request.method!=='GET'&&request.method!=='HEAD')return reply(405);
    const entry=manifest[pathname],etag=`"${entry.sha256}"`;
    const headers={'Content-Type':entry.type,'Cache-Control':'public, max-age=300','ETag':etag,'X-Content-Type-Options':'nosniff'};
    const object=request.method==='HEAD'?await env.BUCKET.head(`media/${entry.sha256}`):await env.BUCKET.get(`media/${entry.sha256}`);
    if(!object)return reply(404);
    if(request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers});
    return new Response(request.method==='HEAD'?null:(object as R2ObjectBody).body,{headers:{...headers,'Content-Length':String(entry.bytes)}});
  };
}
