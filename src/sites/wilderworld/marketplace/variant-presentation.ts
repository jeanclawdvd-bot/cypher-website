import colorways from '../accessories/colorway-images.json';
import type { Variant } from './catalog';
import { getProposedEdition } from './limited-editions';

type OriginalColor = { id:string; name:string; material:string; finish:string; primary:string; secondary:string; accent:string };
const originals = colorways as Record<string,OriginalColor[]>;

/** Merchandising descriptions are concepts, never verified game shader values. */
export function variantPresentation(productId:string|undefined, variant:Variant) {
  const original = productId ? originals[productId]?.find(item=>item.id===variant.id&&item.name===variant.name) : undefined;
  const edition = productId ? getProposedEdition(productId,variant.id) : undefined;
  const palette = original
    ? [{label:'Primary',color:original.primary},{label:'Trim',color:original.secondary},{label:'Accent',color:original.accent}]
    : [{label:'Primary',color:variant.materialSpec?.baseColor??variant.swatch},...(variant.materialSpec?.contrastColor?[{label:'Contrast',color:variant.materialSpec.contrastColor}]:[])];
  const material = original?.material ?? variant.materialSpec?.family;
  const finish = original?.finish;
  const editionText = edition ? `${edition.tierLabel} · ${edition.proposedSupplyCap.toLocaleString('en-US')} planned` : undefined;
  return { material,finish,palette,edition,editionText,tooltip:[variant.name,material,finish,editionText].filter(Boolean).join(' · ') };
}
