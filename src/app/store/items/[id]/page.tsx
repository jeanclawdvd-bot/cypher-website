import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import CollectionProduct from '@/sites/wilderworld/collections/CollectionProduct';
import { findRegistryProduct, registryProducts } from '@/sites/wilderworld/collections/store-registry';
import { findMarketProduct, productHref } from '@/sites/wilderworld/marketplace/catalog';

export function generateStaticParams() { return registryProducts.filter(product => product.section !== 'fashion' && product.storeVisible !== false).map(product => ({ id: product.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = findRegistryProduct((await params).id);
  return { title: `${product?.name ?? 'Collection item'} — Wilder World`, description: product?.description, robots: { index: false, follow: false } };
}
export default async function CollectionItemPage({ params }: { params: Promise<{ id: string }> }) {
  const product = findRegistryProduct((await params).id);
  if (!product) notFound();
  const current = findMarketProduct(product.id);
  if (current) redirect(productHref(current));
  return <CollectionProduct product={product} />;
}
