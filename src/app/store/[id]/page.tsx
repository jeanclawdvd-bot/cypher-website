import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductDetail from '@/sites/wilderworld/accessories/ProductDetail';
import { findIndividualProduct, individualStoreProducts } from '@/sites/wilderworld/accessories/fashion';

export function generateStaticParams() {
  const ids = new Set(individualStoreProducts.flatMap(product => [product.id, product.familyId]));
  return [...ids].filter(id => findIndividualProduct(id)).map(id => ({ id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = findIndividualProduct((await params).id);
  return {
    title: `${product?.name ?? 'Accessory'} — Wilder World`,
    description: product?.description,
    robots: { index: false, follow: false },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = findIndividualProduct((await params).id);
  if (!product) notFound();
  return <ProductDetail key={product.id} product={product} />;
}
