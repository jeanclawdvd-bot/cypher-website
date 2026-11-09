import palettes from './material-palettes.json';
import renderImages from './material-render-images.json';
import carRenderImages from './car-material-render-images.json';
import totemRenderImages from './totem-material-render-images.json';
import fashionRenderImages from './fashion-material-render-images.json';
import referenceApprovals from './reference-fidelity-approvals.json';
import rugMaterialOverrides from './rug-material-overrides.json';
import { findFrankWilderTotem, frankWilderMaterialPreviews } from './frank-wilder-totems';
import { reviewedBottomwearPresentation } from './bottomwear-presentation';

export type MaterialSpec = { family: string; baseColor: string; roughness: number | null; metallic: number | null; pattern: string | null; textureBasis: string; contrastColor?:string };
export type MaterialConcept = { id: string; name: string; image: string | null; thumbnail?: string; srcSet?: string; swatch: string; status: string; renderStatus: 'rendered' | 'pending'; renderMethod: 'native_3d' | 'image_concept' | 'existing' | 'pending'; materialSpec: MaterialSpec; sourceAssets?: string[]; presentationStatus:'approved_reference'|'reference_edit_verified'|'reference_edit_pending'|'not_applicable'; storefrontEligible:boolean };
type ExistingVariant = { id: string; name: string; image: string | null; swatch: string; status: string; sourceAssets?: string[] };
type MaterialInput = { id: string; department: string; subcategory: string; variants: ExistingVariant[]; status: string; image: string | null; sourceAssets?: string[] };
type RenderRecord = { image: string; thumbnail?: string; srcSet?: string; sourceScene?: string; geometryUnchanged?: boolean; materialId?: string; renderMethod?: 'native_3d' | 'image_concept'; sourceReference?:string; presentationStatus?:string; name?:string; swatch?:string; status?:string; materialSpec?:MaterialSpec };
const images = { ...renderImages, ...carRenderImages, ...totemRenderImages, ...fashionRenderImages, ...rugMaterialOverrides } as Record<string, RenderRecord>;
const approvedEdits=referenceApprovals as Record<string,{image:string;sourceReference:string}>;

/** Native geometry fidelity does not establish fidelity to approved photography. */
export function isReviewedClothingReferenceEdit(id:string, rendered:RenderRecord|undefined, approvedOriginalImages:string[]):boolean {
  if (!rendered || rendered.renderMethod!=='image_concept' || !rendered.sourceReference || approvedOriginalImages.includes(rendered.image)) return false;
  const prior=approvedEdits[id];
  return (rendered.presentationStatus==='reference_edit_verified' && approvedOriginalImages.includes(rendered.sourceReference))
    || !!(prior && prior.image===rendered.image && prior.sourceReference===rendered.sourceReference);
}

type RecipeMaterialSpec = Omit<MaterialSpec, 'roughness' | 'metallic' | 'pattern'> & { roughness:number; metallic:number; pattern:string };
const hardClothing = new Set(['HDWR_001_A','HDWR_001_B','HDWR_002','HDWR_002_A','HDWR_003_A','HDWR_006_A','HDWR_006_B','HDWR_006_C','HDWR_007','HDWR_007_A','HDWR_FRD','MASK_H01','XTRA_010_C','XTRA_011']);
function proposedSpec(product: MaterialInput, spec: RecipeMaterialSpec): MaterialSpec {
  if (product.department === 'furniture') {
    if (['seating','sofa','chair'].includes(product.subcategory)) return { ...spec, family: spec.pattern === 'wood' ? 'Umber surface finish with dark base' : 'Seating surface finish with dark base', metallic: Math.min(spec.metallic,.15), roughness: spec.pattern === 'wood' ? .43 : spec.metallic ? .63 : spec.roughness, pattern: 'micrograin' };
    if (product.subcategory === 'rugs') return { ...spec, family:'Woven wool concept', metallic:0, roughness:.86, pattern:'micrograin' };
    if (['tables-desks','coffee_table','desk','storage'].includes(product.subcategory)) return { ...spec, family: spec.pattern === 'wood' ? 'Oiled walnut' : spec.metallic ? 'Brushed aluminum' : 'Satin lacquer', roughness: spec.pattern === 'wood' ? .39 : spec.metallic ? .27 : .38 };
    return { ...spec, family:'Surface finish concept' };
  }
  if (product.department !== 'clothing') return spec;
  if (product.id === 'EYWR_011') return { ...spec, family:'Nonmetal goggle frame and shared elastic finish', roughness:Math.max(spec.roughness,.6), metallic:0 };
  if (product.id.startsWith('MASK_003')) return { ...spec, family:'Patterned woven face covering', roughness:Math.max(spec.roughness,.68), metallic:0, textureBasis:'Authored RGB pattern retained with proposed printed colors. Game material parameter mapping remains unapproved.' };
  const hardSurface = product.id.startsWith('EYWR_') || product.id.startsWith('JWLR_') || hardClothing.has(product.id);
  if (hardSurface) return { ...spec, family: product.subcategory === 'eyewear' ? 'Frame finish concept; optical lens treatment retained separately' : product.subcategory === 'jewelry' ? 'Headphone shell finish; ear cushion material retained separately' : 'Accessory shell finish; soft trim retained separately', roughness: Math.min(spec.roughness, .5), textureBasis: 'Proposed primary surface finish. Authored texture and available RGB regions retained; optical and explicitly fixed source slots remain separate. Game material bindings remain unapproved.' };
  if (product.subcategory === 'footwear') return { ...spec, family: 'Source-masked footwear finish with separate trim', metallic:0, roughness:Math.max(spec.roughness,.68), textureBasis: 'Authored RGB texture regions preserved with proposed upper and trim colors. Region-to-game parameter mapping remains unapproved.' };
  return { ...spec, roughness:Math.max(spec.roughness,.68), metallic:Math.min(spec.metallic,.15), textureBasis:'Proposed primary fabric finish. Authored texture, normal detail and available RGB panel/graphic regions retained; region colors and game material bindings remain unapproved.' };
}

/** Nine visual proposals; these do not create game variants or legacy edition rights. */
export function materialConceptsFor(product: MaterialInput): MaterialConcept[] {
  const frankWilder=findFrankWilderTotem(product.id);
  if(frankWilder) {
    return frankWilderMaterialPreviews(frankWilder).map(preview=>({id:preview.id,name:preview.name,image:preview.image,thumbnail:preview.render?.thumbnail,srcSet:preview.render?.srcSet,swatch:preview.swatch,status:preview.image?'Visual concept; model integration pending':'Requested finish; photo pending',renderStatus:preview.image?'rendered':'pending',renderMethod:preview.image?'image_concept':'pending',presentationStatus:'not_applicable',storefrontEligible:!!preview.image,sourceAssets:[],materialSpec:{...preview.materialSpec,roughness:null,metallic:null,pattern:null,textureBasis:'Requested pendant finish appearance study. Digital geometry, chain assembly, materials and avatar compatibility remain unverified.'}}));
  }
  const key = product.department === 'vehicles' ? (product.subcategory === 'rims' ? 'rims' : 'cars') : product.department in palettes ? product.department : 'furniture';
  const recipes = palettes[key as keyof typeof palettes];
  const existing = product.department === 'clothing' ? product.variants.slice(0,3) : product.status === 'Finish study' ? product.variants.slice(0,9) : [];
  const approvedOriginalImages=existing.flatMap(variant=>variant.image?[variant.image]:[]);
  const result: MaterialConcept[] = existing.map((variant, index) => ({ ...variant, renderStatus: variant.image ? 'rendered' : 'pending', renderMethod: variant.image ? 'existing' : 'pending', presentationStatus:product.department==='clothing'?'approved_reference':'not_applicable', storefrontEligible:product.department!=='clothing'||!!variant.image, materialSpec: product.department === 'clothing' ? { ...recipes[index].materialSpec, baseColor: variant.swatch, roughness:null, metallic:null, pattern:null, family: 'Existing visual concept; surface parameters unverified', textureBasis:'Original image and swatch preserved. Material roughness, metallic response and pattern parameters have not been verified.' } : { ...proposedSpec(product, { ...recipes[index].materialSpec, baseColor: variant.swatch }), textureBasis:'Existing finish study. Original region shaders are preserved in the finish-study source scenes; numeric values here are proposed starting points.' } }));
  for (let index = result.length; index < 9; index++) {
    const recipe = recipes[index];
    const id = `MAT-${product.id}-${recipe.id}`;
    const rendered = images[id];
    const renderMethod = rendered ? rendered.renderMethod ?? 'native_3d' : 'pending';
    const reviewedReferenceEdit=isReviewedClothingReferenceEdit(id,rendered,approvedOriginalImages);
    const storefrontEligible=product.department!=='clothing'||reviewedReferenceEdit;
    const presentationStatus=product.department!=='clothing'?'not_applicable':reviewedReferenceEdit?'reference_edit_verified':'reference_edit_pending';
    const materialSpec={...(rendered?.materialSpec??proposedSpec(product, recipe.materialSpec))};
    if (renderMethod === 'image_concept') materialSpec.textureBasis='Image-generated visual concept guided by this proposed finish palette. Physical shader parameters, source-model and material-region bindings remain unverified.';
    result.push({id, name: rendered?.name??recipe.name, swatch: rendered?.swatch??recipe.swatch, materialSpec, image: rendered?.image ?? null, thumbnail:rendered?.thumbnail, srcSet:rendered?.srcSet, renderStatus: rendered ? 'rendered' : 'pending', renderMethod, presentationStatus, storefrontEligible, status: !storefrontEligible ? 'Reference-matched product image pending; source study archived' : rendered?.status??(rendered ? renderMethod === 'image_concept' ? 'Image concept; source-model binding unverified' : 'Material concept; not applied in game' : 'Material concept; render pending'), sourceAssets: product.sourceAssets});
  }
  // A reviewed construction correction can replace the photograph while retaining
  // the original color ID and source image as provenance.
  const photographed=result.map(variant=>{
    const rendered=images[variant.id];
    if(variant.renderMethod!=='existing'||!isReviewedClothingReferenceEdit(variant.id,rendered,approvedOriginalImages))return variant;
    return {...variant,image:rendered.image,thumbnail:rendered.thumbnail,srcSet:rendered.srcSet,renderMethod:'image_concept' as const,presentationStatus:'reference_edit_verified' as const,status:'Reviewed product image; game binding unverified'};
  });
  const replacement=reviewedBottomwearPresentation(product.id,approvedOriginalImages);
  return replacement?photographed.map(variant=>{
    const photo=replacement.variants.find(item=>item.id===variant.id);
    return photo?{...variant,...photo,renderStatus:'rendered' as const,storefrontEligible:true,status:'Reviewed color study; not implemented in game'}:variant;
  }):photographed;
}

export function applyMaterialConcepts<T extends MaterialInput>(product: T): Omit<T, 'variants'> & { variants: MaterialConcept[]; plannedVariants:MaterialConcept[]; sourceVariants: ExistingVariant[]; defaultVariantId?:string } {
  const plannedVariants=materialConceptsFor(product);
  const presentation=reviewedBottomwearPresentation(product.id,product.variants.flatMap(variant=>variant.image?[variant.image]:[]));
  const correctedDefault=plannedVariants.find(variant=>variant.id===product.variants[0]?.id&&variant.presentationStatus==='reference_edit_verified');
  const lead=plannedVariants.find(variant=>variant.id===presentation?.defaultVariantId)??correctedDefault;
  return { ...product, ...(lead?.image?{image:lead.image,defaultVariantId:lead.id}:{}), sourceVariants: product.variants, plannedVariants, variants: plannedVariants.filter(variant=>variant.storefrontEligible) };
}
