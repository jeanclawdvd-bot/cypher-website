import catalog from './catalog.json';
import curation from './store-curation.json';

// Hidden from merchandising only. Source assets remain available for game work.
export const excludedFamilies = new Set([
  'HDWR_017', 'HDWR_018', 'HDWR_019', 'Cybernetics',
  'BTWR_TRN', 'BTWR_TM2', 'BTWR_017', 'BCON_001', 'GravGlove',
  'HDWR_NONE', 'HDWR_N30', 'HDWR_N3O', 'HDWR_TM2', 'HDWR_TRN',
  'JWLR_002', 'SUIT_017', 'SUIT_Bot', 'SUIT_BOT', 'SUIT_N3O',
  'SUIT_FRN', 'SUIT_RIGB', 'SUIT_TM2', 'SUIT_TRN',
  'TPWR_017', 'TPWR_N30', 'TPWR_TM2', 'TRN_Female', 'TRN_Wings',
  'TPWR_TRN', 'Wings_Floaty', 'WIP', 'XTRA_001', 'XTRA_MagHarness',
  'XTRA_N30', 'XTRA_TRN', 'TPWR_005', 'TPWR_006', 'TPWR_007',
  'HDWR_FRN', 'HDWR_0RN', 'FTWR_TRN', 'FTWR_006', 'BTWR_005', 'EYWR_NONE',
  'BTWR_003', 'XTRA_005', 'FTWR_002', 'HDWR_014', 'MASK_004',
]);

export const hiddenProductIds = new Set(curation.hiddenProductIds);
export const storefrontProducts = catalog.products.filter(p => !excludedFamilies.has(p.id)).map(p => ({...p, variants:p.variants.filter(v => !hiddenProductIds.has(v.sku))}));
export type AccessoryProduct = (typeof catalog.products)[number];
export function findStoreProduct(id: string) {
  return storefrontProducts.find(p => p.id === id);
}
