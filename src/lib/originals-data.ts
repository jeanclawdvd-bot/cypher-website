/** Public explorer metadata fallback. No marketplace prices or mint permissions. */
import type { WilderCollectionEntry } from './wilderCollections';
import type { MarketNft } from './opensea';
import { resolveMediaUrl } from './indexer';

export type OriginalDataProvenance = {
  source: 'opensea' | 'blockscout' | 'indexer';
  retrievedAt: string;
  marketData: 'available' | 'unavailable';
  metadataSource?: 'onchain-token-uri';
};
const EXPLORERS: Record<string, string> = {
  ethereum: 'https://eth.blockscout.com',
  zchain: 'https://z-chain-blockscout.eu-north-2.gateway.fm',
};
const cache = new Map<string, { expires: number; value: Promise<{ data: unknown; retrievedAt: string } | null> }>();
export function originalProvenance(source: OriginalDataProvenance['source'], marketData: OriginalDataProvenance['marketData'] = 'unavailable'): OriginalDataProvenance {
  return { source, marketData, retrievedAt: new Date().toISOString() };
}
export function explorerUrl(entry: WilderCollectionEntry, tokenId?: string): string | null {
  const base = EXPLORERS[entry.chain];
  return base && validAddress(entry.contract) ? base + '/token/' + entry.contract + (tokenId ? '/instance/' + tokenId : '') : null;
}
const validAddress = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-f]{40}$/i.test(value);
const validId = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9][0-9]{0,77})$/.test(value) && BigInt(value) < BigInt(2) ** BigInt(256);
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | null => typeof value === 'string' && value.length > 0 ? value : null;
const count = (value: unknown): number | null => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

/** Blockscout serializes uint256 pagination keys as JSON numbers. Preserve them before JSON.parse. */
export function parseExplorerJson(raw: string): unknown {
  return JSON.parse(raw.replace(/("unique_token"\s*:\s*)(\d+)(?=\s*[,}])/g, '$1"$2"'));
}
async function read(entry: WilderCollectionEntry, suffix: string) {
  const base = EXPLORERS[entry.chain];
  if (!base || !validAddress(entry.contract)) return null;
  const url = base + '/api/v2/tokens/' + entry.contract + suffix;
  const existing = cache.get(url);
  if (existing && existing.expires > Date.now()) return existing.value;
  const value = (async () => {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000), next: { revalidate: 300 } });
      if (!response.ok) return null;
      const raw = await response.text();
      if (raw.length > 2_000_000) return null;
      return { data: parseExplorerJson(raw), retrievedAt: new Date().toISOString() };
    } catch { return null; }
  })();
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(url, { expires: Date.now() + 300_000, value });
  void value.then(result=>{const cached=cache.get(url);if(!result && cached?.value===value) cached.expires=Date.now()+10_000;});
  return value;
}
export function encodeExplorerCursor(entry: WilderCollectionEntry, params: unknown): string | null {
  const values = object(params);
  if (!validId(values.unique_token)) return null;
  return 'bs:' + encodeURIComponent(JSON.stringify({ chain: entry.chain, contract: entry.contract?.toLowerCase(), token: values.unique_token }));
}
export function decodeExplorerCursor(entry: WilderCollectionEntry, cursor: string): string | null {
  try {
    if (!cursor.startsWith('bs:') || cursor.length > 600) return null;
    const value = object(JSON.parse(decodeURIComponent(cursor.slice(3))));
    return value.chain === entry.chain && value.contract === entry.contract?.toLowerCase() && validId(value.token) ? value.token : null;
  } catch { return null; }
}
export function normalizeExplorerInstance(entry: WilderCollectionEntry, input: unknown, retrievedAt: string): MarketNft | null {
  const asset = object(input), token = object(asset.token), metadata = object(asset.metadata);
  if (!validId(asset.id) || String(token.address_hash).toLowerCase() !== entry.contract?.toLowerCase()) return null;
  const traits = Array.isArray(metadata.attributes) ? metadata.attributes.flatMap(value => {
    const attr = object(value);
    return typeof attr.trait_type === 'string' && ['string','number','boolean'].includes(typeof attr.value) ? [{type:attr.trait_type,value:String(attr.value)}] : [];
  }) : [];
  return { identifier: asset.id, name: text(metadata.name) ?? '#' + asset.id,
    sourceAssetId: text(metadata.asset_id), instanceTag: text(metadata.tag),
    image: resolveMediaUrl(text(asset.image_url) ?? text(metadata.image)), collectionSlug: entry.slug,
    contract: entry.contract!, chain: entry.chain, priceEth: null, traits,
    provenance: {source:'blockscout', retrievedAt, marketData:'unavailable',...(asset.metadata_source === 'onchain-token-uri' ? {metadataSource:'onchain-token-uri' as const} : {})} };
}
export async function fetchExplorerPage(entry: WilderCollectionEntry, cursor: string | null = null) {
  const token = cursor ? decodeExplorerCursor(entry,cursor) : null;
  if (cursor && !token) return null;
  const result = await read(entry, '/instances' + (token ? '?unique_token=' + token : ''));
  const data = object(result?.data);
  if (!result || !Array.isArray(data.items)) return null;
  const enriched = await enrichMissingMetadata(entry,data.items);
  const items = enriched.flatMap(value => { const item = normalizeExplorerInstance(entry,value,result.retrievedAt); return item ? [item] : []; });
  return { items, next: encodeExplorerCursor(entry,data.next_page_params), provenance: { source:'blockscout',retrievedAt:result.retrievedAt,marketData:'unavailable' } as OriginalDataProvenance };
}
export async function fetchExplorerCollection(entry: WilderCollectionEntry) {
  const result = await read(entry,'');
  const data = object(result?.data);
  if (!result || String(data.address_hash).toLowerCase() !== entry.contract?.toLowerCase()) return null;
  return { totalSupply: count(data.total_supply), owners: count(data.holders_count), tokenStandard: text(data.type), image: resolveMediaUrl(text(data.icon_url)), provenance:{source:'blockscout',retrievedAt:result.retrievedAt,marketData:'unavailable'} as OriginalDataProvenance };
}
export async function fetchExplorerItem(entry: WilderCollectionEntry, identifier: string) {
  if (!validId(identifier)) return null;
  const result = await read(entry,'/instances/' + identifier);
  const data = object(result ? (await enrichMissingMetadata(entry,[result.data]))[0] : null), metadata = object(data.metadata), token = object(data.token), owner = object(data.owner);
  const item = result && normalizeExplorerInstance(entry,data,result.retrievedAt);
  if (!item || item.identifier !== identifier) return null;
  return { ...item, animationUrl: resolveMediaUrl(text(data.animation_url) ?? text(metadata.animation_url)),
    description: text(metadata.description), collectionName: entry.name ?? entry.label ?? entry.slug,
    ownerAddress: data.is_unique === true && validAddress(owner.hash) ? owner.hash : null, tokenStandard:text(token.type),
    tokenUri: resolveMediaUrl(text(data.token_uri)), explorerUrl:explorerUrl(entry,identifier),
    openseaUrl:entry.chain === 'ethereum' ? 'https://opensea.io/assets/ethereum/' + entry.contract + '/' + identifier : '' };
}

const metadataCache = new Map<string, {expires:number; value:Record<string,unknown>}>();
export function decodeTokenUriResult(result: unknown): string | null {
  if (typeof result !== 'string' || !/^0x[0-9a-f]*$/i.test(result) || result.length > 32768) return null;
  try {
    const hex=result.slice(2), offset=Number(BigInt('0x'+hex.slice(0,64)))*2;
    if (!Number.isSafeInteger(offset) || offset < 64 || offset+64>hex.length) return null;
    const length=Number(BigInt('0x'+hex.slice(offset,offset+64)));
    if (!Number.isSafeInteger(length) || length < 1 || length>4096 || offset+64+length*2>hex.length) return null;
    return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(hex.slice(offset+64,offset+64+length*2).match(/.{2}/g)!,v=>parseInt(v,16)));
  } catch { return null; }
}
/** Metadata recovery is scoped to the verified Land contract, never arbitrary browser URLs. */
async function enrichMissingMetadata(entry: WilderCollectionEntry, inputs: unknown[]): Promise<unknown[]> {
  if (entry.chain !== 'ethereum' || entry.slug !== 'wilder-land-the-island') return inputs;
  const hydrated=inputs.map(value=>{const asset=object(value),key=entry.contract+':'+String(asset.id),cached=metadataCache.get(key);return cached && cached.expires>Date.now()? {...asset,...cached.value}:asset;});
  const missing=hydrated.filter(asset=>validId(asset.id) && !text(object(asset.metadata).name)).slice(0,50);
  if (!missing.length) return hydrated;
  try {
    const requests=missing.map((asset,index)=>({jsonrpc:'2.0',id:index+1,method:'eth_call',params:[{to:entry.contract,data:'0xc87b56dd'+BigInt(String(asset.id)).toString(16).padStart(64,'0')},'latest']}));
    const response=await fetch('https://ethereum-rpc.publicnode.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requests),signal:AbortSignal.timeout(10000)});
    if (!response.ok) return hydrated;
    const raw=await response.text();
    if (raw.length>1_000_000) return hydrated;
    const results:unknown=JSON.parse(raw);
    if (!Array.isArray(results)) return hydrated;
    const byId=new Map(results.map(value=>{const row=object(value);return [row.id,row];}));
    let index=0;
    await Promise.all(Array.from({length:Math.min(5,missing.length)},async()=>{
      while(index<missing.length){
        const current=index++, asset=missing[current];
        const uri=decodeTokenUriResult(byId.get(current+1)?.result);
        if (!uri?.startsWith('ar://')) continue;
        const url=resolveMediaUrl(uri);
        if (!url || !url.startsWith('https://arweave.net/')) continue;
        try {
          const res=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000),next:{revalidate:3600}});
          if (!res.ok) continue;
          const body=await res.text();
          if (body.length>100_000) continue;
          const metadata=object(JSON.parse(body));
          if (!text(metadata.name)) continue;
          const extra={metadata,token_uri:uri,metadata_source:'onchain-token-uri',image_url:resolveMediaUrl(text(metadata.image)),animation_url:resolveMediaUrl(text(metadata.animation_url))};
          Object.assign(asset,extra);
          if (metadataCache.size>=250) metadataCache.delete(metadataCache.keys().next().value!);
          metadataCache.set(entry.contract+':'+String(asset.id),{expires:Date.now()+300_000,value:extra});
        }catch{/* A failed original field stays unavailable. */}
      }
    }));
  } catch { /* Explorer identity remains useful even if the immutable metadata host is offline. */ }
  return hydrated;
}
