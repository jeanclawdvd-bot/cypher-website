import proposal from './limited-editions.proposal.json';

export type ProposedRarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'wild';
export type ProposedEdition = Readonly<{
  productId: string;
  variantId: string;
  variantName: string;
  tier: ProposedRarityTier;
  tierLabel: string;
  tierColor: string;
  proposedSupplyCap: number;
  /** Share of the product's lifetime supply, never a random reveal/drop chance. */
  supplyShareOfProductPercent: number;
  status: 'proposed';
  approvedSupplyCap: null;
  onchainTokenId: null;
  mintAuthorized: false;
}>;
export type ProductEditionProposal = Readonly<{
  productId: string;
  productName: string;
  department: string;
  subcategory: string;
  sourceIds: readonly string[];
  status: 'proposed';
  scope: 'new_store_product_only';
  proposedSupplyCap: number;
  approvedSupplyCap: null;
  mintAuthorized: false;
  allocationRationale: string;
  variants: readonly ProposedEdition[];
}>;

/** A review document, not contract configuration or mint authorization. */
export const LIMITED_EDITION_PROPOSAL = proposal;
export const PROPOSED_RARITY_TIERS = proposal.tiers;
const products = new Map(
  (proposal.products as ProductEditionProposal[]).map(product => [product.productId, product]),
);

/** Only the persisted new-store IDs are eligible. Never infer a legacy assignment. */
export function getProductEditionProposal(productId: string): ProductEditionProposal | undefined {
  return products.get(productId);
}

/** Pair-scoped lookup prevents another product's finish ID being accepted. */
export function getProposedEdition(productId: string, variantId: string): ProposedEdition | undefined {
  return products.get(productId)?.variants.find(edition => edition.variantId === variantId);
}
