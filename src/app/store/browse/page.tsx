import type { Metadata } from 'next';
import { MarketplaceBrowse } from '@/sites/wilderworld/marketplace/Marketplace';
export const metadata:Metadata={title:'All products — Wilder World',robots:{index:false,follow:false}};
export default async function BrowsePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const value=(key:string)=>typeof params[key]==='string'?params[key] as string:undefined;
  return <MarketplaceBrowse key={JSON.stringify(params)} initialBrand={value('brand')} initialSort={value('sort')} initialView={value('view')} initialGender={value('gender')} initialDepartment={value('department')} initialCategory={value('category')} initialQuery={value('q')} initialFinish={value('finish')}/>;
}
