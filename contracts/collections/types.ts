/** ABI-aligned integration types. No contract addresses, live edition IDs or supply values are provided. */
export type Address = `0x${string}`;
export type Bytes32 = `0x${string}`;
export type CollectionKey = 'WilderVehicles' | 'WilderClothing' | 'WilderFurniture';
export enum ItemKind { None = 0, Vehicle = 1, RimSet = 2, Clothing = 3, Totem = 4, Furniture = 5 }
export enum InputKind { None = 0, Resource = 1, Component = 2 }
export enum JobState { None = 0, Authorized = 1, Completed = 2, Cancelled = 3 }
export interface ProductConfig { productId: Bytes32; sourceIdHash: Bytes32; kind: ItemKind; cap: bigint }
export interface EditionConfig { editionId: Bytes32; productId: Bytes32; colorwayId: Bytes32; cap: bigint; metadataURI: string }
export interface MintSettlement { settlementId: Bytes32; editionId: Bytes32; recipient: Address }
export interface MintReceipt extends MintSettlement { collection: Address; tokenId: bigint; production: boolean; transactionHash: Bytes32 }
export interface UsePermit {
  owner: Address;
  tokenId: bigint;
  contextId: Bytes32;
  eligibilityHash: Bytes32;
  nonce: bigint;
  ownershipVersion: bigint;
  deadline: bigint;
}
export interface SignedUsePermit { permit: UsePermit; attestor: Address; signature: `0x${string}` }
export interface ProductionInput { token: Address; id: bigint; amount: bigint; kind: InputKind.Resource | InputKind.Component }
export interface RecipeConfig { recipeId: Bytes32; collection: Address; editionId: Bytes32; inputs: ProductionInput[] }
export interface ProductionJobAuthorization { jobSalt: Bytes32; recipeId: Bytes32; deadline: bigint }
/** Server verifier projection. Resolve these from finalized logs + edition/product views, never browser fields. */
export interface VerifiedMintIdentity {
  settlementId: Bytes32;
  recipient: Address;
  productKey: Bytes32; // tokenProduct(tokenId) / editions(editionId).productId
  editionId: Bytes32;
  variantId: Bytes32; // editions(editionId).colorwayId; named variantId in the fulfillment domain
  tokenId: bigint;
}
/** Trinity uses an existing external token reference. This must never be passed as new-mint authorization. */
export interface LegacyOwnershipReference {
  kind: 'existing-owned';
  chainId: bigint;
  contract: Address;
  tokenStandard: 'ERC721' | 'ERC1155';
  tokenId: bigint;
  requiredBalance: bigint;
  mintRoute: null;
}
export const usePermitTypes = {
  Use: [
    { name: 'owner', type: 'address' }, { name: 'tokenId', type: 'uint256' },
    { name: 'contextId', type: 'bytes32' }, { name: 'eligibilityHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' }, { name: 'ownershipVersion', type: 'uint256' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const;
