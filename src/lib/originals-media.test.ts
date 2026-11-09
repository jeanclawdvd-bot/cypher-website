import { describe,expect,it,vi,afterEach } from 'vitest';
import {originalMediaKey,originalMediaParameters,originalThumbnailUrl,localizeOriginalImages,serveLocalOriginalMedia} from './originals-media';
const CID='Qm'+'a'.repeat(44);
afterEach(()=>vi.unstubAllGlobals());
describe('local originals thumbnail boundary',()=>{
 it('preserves CID and path while accepting only fixed sizes and safe paths',()=>{
  expect(originalThumbnailUrl(`https://ipfs.filebase.io/ipfs/${CID}/image.png`)).toBe(`/api/market/media?cid=${CID}%2Fimage.png&w=640`);
  for(const path of [`${CID}/../secret`,`${CID}/%2fsecret`,`${CID}//secret`,`${CID}/x?url=http://evil`,'https://evil.test/a'])expect(originalMediaKey(path)).toBeNull();
  for(const query of [`cid=${CID}&w=999`,`cid=${CID}&url=https://evil`,`cid=${CID}&cid=${CID}`,`cid=${CID}&w=0640`])expect(originalMediaParameters(new URL(`http://localhost/media?${query}`))).toBeNull();
  for(const url of [`https://evil.test/ipfs/${CID}`,`https://ipfs.filebase.io.evil.test/ipfs/${CID}`,`https://user@ipfs.filebase.io/ipfs/${CID}`])expect(originalThumbnailUrl(url)).toBe(url);
 });
 it('localizes only loopback local catalog responses, preserving original artwork identity',async()=>{
  const source=`https://ipfs.filebase.io/ipfs/${CID}`;
  const result=await localizeOriginalImages(Response.json({items:[{image:source,identifier:'123'}]}),new Request('http://127.0.0.1:8791/api/market/nfts'),'local');
  expect(((await result.json()) as {items:unknown[]}).items[0]).toEqual({identifier:'123',image:`/api/market/media?cid=${CID}&w=640`,originalImage:source});
  const remote=Response.json({items:[{image:source}]});expect(await localizeOriginalImages(remote,new Request('https://store.example/api/market/nfts'),'local')).toBe(remote);
 });
 it('fails closed remotely and never forwards caller URL, cookie or authorization to helper',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('webp',{headers:{'Content-Type':'image/webp'}}));vi.stubGlobal('fetch',fetcher);
  expect((await serveLocalOriginalMedia(new Request(`https://store.test/api/market/media?cid=${CID}`),'local')).status).toBe(404);
  expect((await serveLocalOriginalMedia(new Request(`http://localhost/api/market/media?cid=${CID}`),'production')).status).toBe(404);
  expect(fetcher).not.toHaveBeenCalled();
  const result=await serveLocalOriginalMedia(new Request(`http://localhost/api/market/media?cid=${CID}&w=320`,{headers:{Cookie:'private',Authorization:'private'}}),'local');
  expect(result.status).toBe(200);expect(fetcher.mock.calls[0][0]).toBe(`http://127.0.0.1:8793/media?cid=${CID}&w=320`);expect(JSON.stringify(fetcher.mock.calls[0])).not.toContain('private');
 });
 it('falls back to the identical fixed-gateway CID if helper unavailable',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  const result=await serveLocalOriginalMedia(new Request(`http://localhost/api/market/media?cid=${CID}`),'local');
  expect(result.status).toBe(307);expect(result.headers.get('Location')).toBe(`https://ipfs.filebase.io/ipfs/${CID}`);
 });
});
