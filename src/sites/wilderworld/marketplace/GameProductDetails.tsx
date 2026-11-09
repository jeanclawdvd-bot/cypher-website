'use client';

import { ChevronDown, Check } from 'lucide-react';
import type { Variant } from './catalog';
import { getProductGameDetails } from './product-game-details';
import { variantPresentation } from './variant-presentation';
import styles from './GameProductDetails.module.css';

export function ProductMaterialPicker({productId,options,selectedId,onSelect,label='Material',regionLabel='Finishes'}:{productId?:string;options:Variant[];selectedId?:string;onSelect:(id:string)=>void;label?:string;regionLabel?:string}) {
  if(!options.length)return null;
  const selected=options.find(option=>option.id===selectedId);
  return <section className={styles.options} aria-label={regionLabel}>
    <div className={styles.optionLabel}><p>{label} <strong>{selected?.name??'Choose a finish'}</strong></p><span>{options.length} finishes</span></div>
    <div className={styles.swatches}>{options.map(option=>{
      const details=variantPresentation(productId,option);
      return <button type="button" key={option.id} aria-label={option.name} aria-pressed={selectedId===option.id} title={details.tooltip} onClick={()=>onSelect(option.id)}>
        <span style={{background:option.swatch}} aria-hidden />{selectedId===option.id&&<Check size={13} strokeWidth={2.5} className={styles.selectedCheck} aria-hidden/>}
      </button>;
    })}</div>
    {selected&&!selected.image&&<p className={styles.optionNote}>Image coming soon.</p>}
  </section>;
}

export default function GameProductDetails({productId,variantId,specifications=[],story}:{productId:string;variantId?:string;specifications?:{label:string;value:string}[];story?:string}) {
  const details=getProductGameDetails(productId);
  if(!details)return null;
  const sourceIds=details.traceability.sourceIds.filter(id=>id!==productId);
  return <section className={styles.details} aria-label="Wilder World item details">
    <details className={styles.disclosure}><summary>Story <ChevronDown size={16} aria-hidden/></summary><div className={styles.disclosureContent}><p>{story||details.intendedUse}</p></div></details>
    <details className={styles.disclosure}><summary>What’s included <ChevronDown size={16} aria-hidden/></summary><div className={styles.disclosureContent}>
      <ul>{details.includedContents.map(content=><li key={content}>{content.replace(' is proposed','').replace('A preview of this individual totem design.','One digital totem in the selected design.').replace('outside the proposed rim product','not included')}</li>)}</ul><p>One item in the selected finish. Other finishes are separate editions.</p>
      {specifications.length>0&&<dl className={styles.facts}>{specifications.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
      <dl className={styles.facts}><div><dt>Item identifier</dt><dd>{productId}</dd></div>{variantId&&<div><dt>Variant</dt><dd>{variantId}</dd></div>}{sourceIds.length>0&&<div><dt>Source SKU</dt><dd>{sourceIds.join(' · ')}</dd></div>}</dl>
      <h3>Fit & in-game use</h3><p>{details.intendedUse.replace('A proposed ','A planned ')}</p>
      {details.compatibility.supportedFits.length>0&&<dl className={styles.facts}><div><dt>Recorded fit</dt><dd>{details.compatibility.supportedFits.join(', ')}</dd></div></dl>}
      {details.compatibility.unsupportedFits.length>0&&<p>Not supported: {details.compatibility.unsupportedFits.join(', ')}.</p>}
      <p>In-game compatibility will be confirmed before release.</p>
    </div></details>
    <details className={styles.disclosure}><summary>Availability & delivery <ChevronDown size={16} aria-hidden/></summary><div className={styles.disclosureContent}><strong className={styles.readiness}>Coming soon</strong><p>Purchasing is not yet available. Release dates, final contents and in-game delivery will be confirmed before launch.</p><p>Browsing or saving an item does not grant ownership or access in game.</p></div></details>
  </section>;
}
