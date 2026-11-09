import type { Metadata } from 'next';
import ApartmentInventory, { type ApartmentInventoryData } from '@/sites/wilderworld/collections/ApartmentInventory';
import data from '@/sites/wilderworld/collections/apartment-definition.json';

export const metadata: Metadata = {
  title: 'Apartment inventory — Wilder World',
  description: 'Review the saved apartment inventory: source objects, assembly pieces and furnishings.',
  robots: { index: false, follow: false },
};

export default function ApartmentInventoryPage() {
  return <ApartmentInventory data={data as unknown as ApartmentInventoryData} />;
}
