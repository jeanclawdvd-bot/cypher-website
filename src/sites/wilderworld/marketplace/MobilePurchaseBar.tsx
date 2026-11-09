'use client';

import { ArrowUpRight } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import styles from './MobilePurchaseBar.module.css';

const query='(max-width: 800px)';
const subscribe=(listener:()=>void)=>{
  const media=window.matchMedia?.(query);
  media?.addEventListener('change',listener);
  return ()=>media?.removeEventListener('change',listener);
};
const snapshot=()=>window.matchMedia?.(query).matches??false;

/** Shares the page's selection and action; never a second checkout state. */
export default function MobilePurchaseBar({priceCents,selection,label,onBuy,disabled=false,hidden=false}:{priceCents:number|null;selection?:string;label:string;onBuy?:()=>void;disabled?:boolean;hidden?:boolean}) {
  const mobile=useSyncExternalStore(subscribe,snapshot,()=>false);
  if(hidden||!mobile)return null;
  return <div className={styles.space}>
    <aside className={styles.bar} aria-label="Mobile purchase">
      <div><strong>{priceCents===null?'Coming soon':`$${(priceCents/100).toLocaleString('en-US',{maximumFractionDigits:2})}`}</strong><span>{selection}</span></div>
      <button type="button" onClick={onBuy} disabled={disabled}>{label}{!disabled&&<ArrowUpRight size={17} aria-hidden/>}</button>
    </aside>
  </div>;
}
