import { notFound } from 'next/navigation';
import { MarketplaceProduct } from '@/sites/wilderworld/marketplace/Marketplace';
import { findMarketProduct,marketProducts } from '@/sites/wilderworld/marketplace/catalog';
export function generateStaticParams(){return marketProducts.filter(p=>!p.href).map(p=>({id:p.id}));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}) {const product=findMarketProduct((await params).id);return {title:`${product?.name??'Product'} — Wilder World`,description:product?.description,robots:{index:false,follow:false}};}
export default async function ProductPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{variant?:string}>}) {
 const {id}=await params;
 if(!findMarketProduct(id))notFound();
 const initialVariant=(await searchParams).variant;
 return <MarketplaceProduct key={`${id}:${initialVariant??''}`} id={id} initialVariant={initialVariant}/>;
}
