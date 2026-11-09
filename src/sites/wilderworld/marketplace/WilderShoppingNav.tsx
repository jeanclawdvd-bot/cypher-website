'use client';

import {usePathname} from 'next/navigation';
import {MarketHeader} from './Marketplace';

/** Store pages own their header so search can filter their current collection. */
export function hasPageShoppingNavigation(pathname:string):boolean {
  return ['/', '/store', '/store/browse', '/store/account'].includes(pathname)
    || /^\/store\/collections\/(vehicles|rims|clothing|furniture|statues|totems)\/?$/.test(pathname)
    || pathname==='/store/market' || pathname.startsWith('/store/market/')
    || pathname.startsWith('/store/products/');
}

export default function WilderShoppingNav(){
  const pathname=usePathname()??'/';
  const department=pathname.startsWith('/store/collections/furniture/')?'furniture':/^\/store\/[^/]+$/.test(pathname)?'clothing':'none';
  return hasPageShoppingNavigation(pathname)?null:<MarketHeader department={department}/>;
}
