/** Local thumbnail transport. The CID remains the content identity, never a token ID. */
export const ORIGINAL_MEDIA_WIDTHS = [320, 640, 1280] as const;
export function originalMediaKey(value: string | null): string | null {
  if (!value || value.length > 512) return null;
  const [cid, ...parts] = value.split('/');
  if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/.test(cid)) return null;
  if (parts.some(part => !/^[A-Za-z0-9._~-]{1,160}$/.test(part) || part === '.' || part === '..')) return null;
  return value;
}
export function originalMediaParameters(url: URL): { key: string; width: number } | null {
  if ([...url.searchParams.keys()].some(key => !['cid','w'].includes(key)) || url.searchParams.getAll('cid').length !== 1 || url.searchParams.getAll('w').length > 1) return null;
  const key = originalMediaKey(url.searchParams.get('cid'));
  const rawWidth = url.searchParams.get('w') ?? '640';
  const width = Number(rawWidth);
  return key && /^(320|640|1280)$/.test(rawWidth) ? { key, width } : null;
}
export const isLoopback = (hostname: string) => ['127.0.0.1','localhost','[::1]'].includes(hostname);
export function originalThumbnailUrl(source: string | null, width = 640): string | null {
  if (!source || !ORIGINAL_MEDIA_WIDTHS.includes(width as 640)) return source;
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.hostname !== 'ipfs.filebase.io' || url.port || url.username || url.password || url.search || url.hash || !url.pathname.startsWith('/ipfs/')) return source;
    const key = originalMediaKey(url.pathname.slice(6));
    return key ? `/api/market/media?cid=${encodeURIComponent(key)}&w=${width}` : source;
  } catch { return source; }
}
export async function localizeOriginalImages(response: Response, request: Request, mode?: string): Promise<Response> {
  const url = new URL(request.url);
  if (mode !== 'local' || !isLoopback(url.hostname) || !response.ok || !['/api/market/nfts','/api/market/item'].includes(url.pathname)) return response;
  const data = await response.json() as { items?: { image: string | null; originalImage?: string | null }[]; item?: { image: string | null; originalImage?: string | null } };
  for (const item of data.items ?? (data.item ? [data.item] : [])) {
    const original = item.image;
    item.image = originalThumbnailUrl(original, data.item ? 1280 : 640);
    if (item.image !== original) item.originalImage = original;
  }
  return new Response(JSON.stringify(data), {status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
export async function serveLocalOriginalMedia(request: Request, mode?: string): Promise<Response> {
  const url = new URL(request.url);
  if (mode !== 'local' || !isLoopback(url.hostname)) return new Response('Not found',{status:404});
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
  const params = originalMediaParameters(url);
  if (!params) return new Response('Invalid media request',{status:400});
  const query = new URLSearchParams({cid:params.key,w:String(params.width)});
  try {
    const result = await fetch(`http://127.0.0.1:8793/media?${query}`, {method:request.method,headers:{...(request.headers.get('if-none-match')?{'If-None-Match':request.headers.get('if-none-match')!}:{})},signal:AbortSignal.timeout(65_000),redirect:'error'});
    if (result.ok || result.status === 304) return result;
  } catch { /* The original CID stays available if the local helper is offline. */ }
  return new Response(null,{status:307,headers:{Location:`https://ipfs.filebase.io/ipfs/${params.key}`,'Cache-Control':'no-store'}});
}
