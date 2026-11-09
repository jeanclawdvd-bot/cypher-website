import type { Metadata } from 'next';
import { MarketplaceBrowse } from '@/sites/wilderworld/marketplace/Marketplace';
import { departments, subcategoryName } from '@/sites/wilderworld/marketplace/catalog';

type Search = Record<string,string|string[]|undefined>;
const categories = departments.find(department => department.id === 'clothing')!.subs;
function categoryFrom(search: Search) {
  // Existing Headwear links retain the full game category; current navigation
  // can select its two presentation groups without changing source taxonomy.
  return typeof search.category === 'string' && (search.category === 'headwear' || categories.some(item => item.id === search.category)) ? search.category : 'all';
}
export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const category = categoryFrom(await searchParams);
  const title = category === 'all' ? 'Clothing' : subcategoryName(category);
  return { title: `${title} — Wilder World`, description: 'Explore individual Wilder World clothing styles and color concepts.', robots: { index: false, follow: false } };
}
export default async function ClothingCollectionPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params=await searchParams;const category = categoryFrom(params);const value=(key:string)=>typeof params[key]==='string'?params[key] as string:undefined;
  return <MarketplaceBrowse key={JSON.stringify(params)} initialDepartment="clothing" initialCategory={category} initialQuery={value('q')} initialBrand={value('brand')} initialSort={value('sort')} initialView={value('view')} initialGender={value('gender')} initialFinish={value('finish')} />;
}
