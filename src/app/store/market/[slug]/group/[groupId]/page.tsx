import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {findOriginalFamily} from '@/lib/original-product-groups';
import OriginalGroupedProduct from '../../../OriginalGroupedProduct';
export async function generateMetadata({params}:{params:Promise<{slug:string;groupId:string}>}):Promise<Metadata>{
  const {slug,groupId}=await params;
  const family=findOriginalFamily(slug,groupId);
  return {title:`${family?.name??'Original collectible'} — Wilder World`,description:family?.description,robots:{index:false,follow:false}};
}
export default async function Page({params,searchParams}:{params:Promise<{slug:string;groupId:string}>;searchParams:Promise<{variant?:string}>}) {
  const {slug,groupId}=await params;
  const family=findOriginalFamily(slug,groupId);
  if(!family)notFound();
  const initialVariant=(await searchParams).variant;
  return <OriginalGroupedProduct key={`${family.id}:${initialVariant??''}`} family={family} initialVariant={initialVariant}/>;
}
