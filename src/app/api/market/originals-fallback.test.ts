import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/opensea',async(original)=>({...await original<typeof import('@/lib/opensea')>(),openseaFetch:vi.fn().mockResolvedValue(null),fetchNftsByContract:vi.fn().mockResolvedValue(null),fetchNftByContract:vi.fn().mockResolvedValue(null),fetchBestListingsPage:vi.fn().mockResolvedValue(null),fetchBestListingsMap:vi.fn().mockResolvedValue({})}));
vi.mock('@/lib/indexer',async(original)=>({...await original<typeof import('@/lib/indexer')>(),indexerFetch:vi.fn().mockResolvedValue(null)}));
vi.mock('@/lib/originals-data',async(original)=>({...await original<typeof import('@/lib/originals-data')>(),fetchExplorerPage:vi.fn(),fetchExplorerItem:vi.fn(),fetchExplorerCollection:vi.fn().mockResolvedValue(null)}));
import {fetchExplorerPage,fetchExplorerItem} from '@/lib/originals-data';
import {GET as nfts} from './nfts/route';
import {GET as item} from './item/route';
const request=(path:string)=>new Request('http://localhost/api/market/'+path);
const provenance={source:'blockscout' as const,marketData:'unavailable' as const,retrievedAt:'2026-11-07T12:00:00Z'};
const nft={identifier:'123',name:'Actual item',image:null,collectionSlug:'wilderworld',contract:'0xc2e9678A71e50E5AeD036e00e9c5caeb1aC5987D',chain:'ethereum',priceEth:null,traits:[],provenance};
beforeEach(()=>{vi.mocked(fetchExplorerPage).mockReset();vi.mocked(fetchExplorerItem).mockReset();});
describe('originals browse fallback API',()=>{
 it('returns real catalog items for all without claiming they are listed',async()=>{
  vi.mocked(fetchExplorerPage).mockResolvedValue({items:[nft],next:null,provenance});
  const response=await nfts(request('nfts?slug=wilderworld&status=all'));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({items:[{identifier:'123',priceEth:null}],provenance:{marketData:'unavailable'}});
 });
 it('does not substitute catalog metadata for a failed live listings query',async()=>{
  expect((await nfts(request('nfts?slug=wilderworld&status=listed'))).status).toBe(502);
  expect(fetchExplorerPage).not.toHaveBeenCalled();
 });
 it('does not silently restart another providers pagination',async()=>{
  expect((await nfts(request('nfts?slug=wilderworld&status=all&next=opensea-cursor'))).status).toBe(502);
  expect(fetchExplorerPage).not.toHaveBeenCalled();
 });
 it('returns configured exact-token metadata and rejects contract substitution',async()=>{
  vi.mocked(fetchExplorerItem).mockResolvedValue({...nft,animationUrl:null,description:null,collectionName:'Wilder Wheels',ownerAddress:null,tokenStandard:'ERC-721',tokenUri:null,explorerUrl:null,openseaUrl:''});
  const response=await item(request('item?slug=wilderworld&identifier=123'));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({item:{identifier:'123',provenance:{source:'blockscout'}}});
  const wrong=await item(request('item?slug=wilderworld&identifier=123&contract=0x1111111111111111111111111111111111111111'));
  expect(wrong.status).toBe(400);
 });
});
