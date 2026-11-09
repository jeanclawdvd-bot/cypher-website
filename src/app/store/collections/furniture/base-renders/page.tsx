import type { Metadata } from 'next';
import FurnitureBaseGallery from '@/sites/wilderworld/collections/FurnitureBaseGallery';
import { furnitureBaseRenders } from '@/sites/wilderworld/collections/furniture-base-images';

export const metadata: Metadata = {
  title: 'Furniture base renders — Wilder World',
  description: 'Review neutral source-geometry studies for the apartment furniture collection.',
  robots: { index: false, follow: false },
};
export default function FurnitureBaseRenderPage() { return <FurnitureBaseGallery data={furnitureBaseRenders} />; }
