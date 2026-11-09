import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketplaceBrowse } from '@/sites/wilderworld/marketplace/Marketplace';
import { departments } from '@/sites/wilderworld/marketplace/catalog';

export function generateStaticParams() { return departments.filter(d=>d.id!=='clothing').map(d=>({section:d.id})); }
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return { title: `${departments.find(d=>d.id===section)?.name??'Collection'} — Wilder World`, robots: { index: false, follow: false } };
}
export default async function CollectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const { section } = await params;
  if (!departments.some(d=>d.id===section)) notFound();
  const p=await searchParams;const value=(k:string)=>typeof p[k]==='string'?p[k] as string:undefined;
  return <MarketplaceBrowse key={`${section}:${JSON.stringify(p)}`} initialBrand={value('brand')} initialSort={value('sort')} initialView={value('view')} initialGender={value('gender')} initialDepartment={section} initialCategory={value('category')} initialQuery={value('q')} initialFinish={value('finish')} />;
}
