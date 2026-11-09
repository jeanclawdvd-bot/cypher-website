import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeTokenUriResult, decodeExplorerCursor, encodeExplorerCursor, fetchExplorerCollection, fetchExplorerItem, fetchExplorerPage, normalizeExplorerInstance, parseExplorerJson } from './originals-data';
import { getEntryBySlug } from './wilderCollections';
import {resolveMediaUrl} from './indexer';
const entry = getEntryBySlug('wilderworld')!;
const id='115787880292434650975124508806625357760024589367978541287174003172681299708723';
const instance = {id, token:{address_hash:entry.contract,type:'ERC-721'},is_unique:true,owner:{hash:'0x1111111111111111111111111111111111111111'},image_url:'ipfs://QmImage',metadata:{name:'Whyline',description:'Wissan',attributes:[{trait_type:'Rim',value:'Type 1'},{trait_type:'Invalid',value:{foo:1}}]}};
afterEach(()=>vi.unstubAllGlobals());
describe('public original collectible metadata',()=>{
  it('decodes exact onchain Arweave URIs and rejects malformed or unbounded responses',()=>{
    const uri='ar://C-ukHiVDE_twDYirdiEZOH-Bjd4JdzjYbPn0Q84_SOA/123.json';
    const hex=Buffer.from(uri).toString('hex');
    const encoded='0x'+(32).toString(16).padStart(64,'0')+uri.length.toString(16).padStart(64,'0')+hex.padEnd(Math.ceil(hex.length/64)*64,'0');
    expect(decodeTokenUriResult(encoded)).toBe(uri);
    expect(resolveMediaUrl(uri)).toBe('https://arweave.net/C-ukHiVDE_twDYirdiEZOH-Bjd4JdzjYbPn0Q84_SOA/123.json');
    expect(resolveMediaUrl('ar://C-ukHiVDE_twDYirdiEZOH-Bjd4JdzjYbPn0Q84_SOA/../secret')).toBeNull();
    expect(resolveMediaUrl('https://dweb.link/ipfs/QmImage')).toBe('https://ipfs.filebase.io/ipfs/QmImage');
    expect(resolveMediaUrl('https://ipfs.io/ipfs/QmImage')).toBe('https://ipfs.filebase.io/ipfs/QmImage');
    expect(decodeTokenUriResult('0x')).toBeNull();
    expect(decodeTokenUriResult('0x'+'f'.repeat(64))).toBeNull();
  });
  it('preserves uint256 pagination exactly rather than rounding in JSON.parse',()=>{
    const parsed=parseExplorerJson('{"next_page_params":{"unique_token":'+id+'}}') as {next_page_params:{unique_token:string}};
    expect(parsed.next_page_params.unique_token).toBe(id);
    const cursor=encodeExplorerCursor(entry,parsed.next_page_params)!;
    expect(decodeExplorerCursor(entry,cursor)).toBe(id);
    expect(decodeExplorerCursor(getEntryBySlug('wilder-moto')!,cursor)).toBeNull();
    expect(decodeExplorerCursor(entry,'https://attacker.invalid')).toBeNull();
    expect(encodeExplorerCursor(entry,{unique_token:1.157e77})).toBeNull();
  });
  it('rejects mismatched contracts and token ids and keeps actual trait and source evidence',()=>{
    const normalized=normalizeExplorerInstance(entry,{...instance,metadata:{...instance.metadata,asset_id:'Barrel_Suppressor_Small_KMS',tag:'27008'}},'2026-11-07T12:00:00Z');
    expect(normalized).toMatchObject({sourceAssetId:'Barrel_Suppressor_Small_KMS',instanceTag:'27008'});
    expect(normalized).toMatchObject({identifier:id,collectionSlug:'wilderworld',name:'Whyline',priceEth:null,traits:[{type:'Rim',value:'Type 1'}],provenance:{source:'blockscout',marketData:'unavailable'}});
    expect(normalized?.image).toBe('https://ipfs.filebase.io/ipfs/QmImage');
    expect(normalizeExplorerInstance(entry,{...instance,id:1},'now')).toBeNull();
    expect(normalizeExplorerInstance(entry,{...instance,token:{address_hash:'0x0000000000000000000000000000000000000000'}},'now')).toBeNull();
  });
  it('fetches read-only inventory and detail with unknown prices, standard and observed owner',async()=>{
    const fetcher=vi.fn(async(url:string)=>new Response(JSON.stringify(url.endsWith('/instances')?{items:[instance],next_page_params:null}:instance),{status:200}));
    vi.stubGlobal('fetch',fetcher);
    const page=await fetchExplorerPage(entry);
    expect(page?.items).toHaveLength(1);
    expect(page?.provenance.marketData).toBe('unavailable');
    const item=await fetchExplorerItem(entry,id);
    expect(item).toMatchObject({ownerAddress:'0x1111111111111111111111111111111111111111',tokenStandard:'ERC-721',priceEth:null});
    expect(item?.explorerUrl).toContain('/instance/'+id);
    expect(fetcher.mock.calls.every(([url])=>url.startsWith('https://eth.blockscout.com/api/v2/tokens/'+entry.contract))).toBe(true);
  });
  it('does not invent an owner for multiple-copy ERC1155 items',async()=>{
    const packs=getEntryBySlug('packs')!;
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({...instance,id:'1',is_unique:false,token:{address_hash:packs.contract,type:'ERC-1155'}}),{status:200})));
    const item=await fetchExplorerItem(packs,'1');
    expect(item?.ownerAddress).toBeNull();
    expect(item?.openseaUrl).toBe('');
    expect(item?.chain).toBe('zchain');
  });
  it('leaves unknown supply and provider failures unresolved',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:503})));
    expect(await fetchExplorerCollection(getEntryBySlug('aws0')!)).toBeNull();
    expect(await fetchExplorerPage(entry,'bs:malformed')).toBeNull();
  });
});
