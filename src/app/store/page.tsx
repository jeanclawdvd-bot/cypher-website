import type { Metadata } from 'next';
import { MarketplaceHome } from '@/sites/wilderworld/marketplace/Marketplace';
export const metadata: Metadata = { title: 'Wilder World — Shop the simulation', description: 'Shop Wilder World: clothing, vehicles, rims, furniture, statues and totems for your life in Wiami.', robots: { index: false, follow: false } };
export default function StorePage() { return <MarketplaceHome />; }
