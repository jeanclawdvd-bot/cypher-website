# Clothing catalog structure — 8 November 2026

This supersedes the historic gender-label and color counts in accessory-store.md. It finalizes storefront organization; game fit, edition approval and production metadata remain separate release work.

## Shopper experience

- One style entry for a source-backed matching Men/Women design. The product page offers Fit, then the nine colors for that specific fit. Existing SKU URLs remain valid; fit links select the exact counterpart URL rather than rewriting its identity.
- Separate designs and component configurations stay separate products. Scoop-neck and V-neck crop tops are separate; full/reduced utility trousers are separate; different suit silhouettes are separate.
- Hats, glasses, headphones and other shared items remain single products. No visible Unisex category. Shared source-table support can qualify an item for both filters; a default merchandising label cannot.
- One purchase means one fit and one approved color. Selecting Men/Women never grants the other fit, copies its color list or merges its order book. The page's market, reviews and preview bag remain keyed to the selected SKU and variant. A cross-fit market overview is still a later integration, not implemented by grouping browse cards.
- Swatches use solid primary colors; material and rarity descriptions remain in their titles. Mobile purchase follows the current selection and existing preview action. Production purchase stays disabled.

## Inventory and evidence

| Measure | Count |
| --- | ---: |
| Retained clothing SKU records | 166 |
| Clothing style entries | 156 |
| Source-backed fit pairings | 10 |
| Source-backed women’s cuts | 15 |
| Men’s cuts in the paired families | 10 |
| Additional shared HM/HF source-table records | 46 |
| Other items requiring fit confirmation | 95 |
| Clothing visual color concepts | 1,494 |
| Entire store SKU records / visual concepts | 221 / 1,989 |
| Entire store browse style entries | 211 |

The original 163 curated clothing SKU records plus BTWR_003_F, TPWR_005 and TPWR_006 are retained. No removed male counterpart, leggings candidate or duplicate stock is restored. Nine visual concepts do not prove nine implemented game materials.

## Paired designs

| Style | Men’s SKU | Women’s SKU |
| --- | --- | --- |
| Undertow Ledger | BTWR_001 | BTWR_001_F |
| Common Ground | BTWR_002 | BTWR_002_F |
| Common Ground / 02 | BTWR_002_A | BTWR_002_A_F |
| Wrong Exit | BTWR_004 | BTWR_004_F |
| Wrong Exit / 02 | BTWR_004_A | BTWR_004_A_F |
| Marble Debt | FTWR_005 | FTWR_005_A |
| Borrowed Body | SUIT_001 | SUIT_001_A |
| Exit Velocity | SUIT_002 | SUIT_002_A |
| Duplicate Citizen | SUIT_003 | SUIT_003_A |
| Permanent Guest | SUIT_004 | SUIT_004_A |

Basement Anthem stays separate because its artwork differs. Grave Courtesy / 02 remains Women; its excluded male counterpart stays excluded. The three restored women’s designs retain their own pages.

## Identity and supply

`styleId -> fit-specific productId / sourceSku -> conceptVariantId -> approved edition -> individual tokenId`

The first three levels exist. Approved edition IDs, token IDs, final material bindings and mint rights remain unassigned. The proposed Clothing ERC-721 contract can mint distinct instances of each approved fit/color edition. Grouping two products on a style page does not change the contract or make two tokens interchangeable.

No supply or revenue proposal is changed. Existing per-SKU allocations and prices remain the calculation basis; do not multiply them by the new number of browse cards. A future budget defined per shared style must explicitly allocate stock between fits rather than minting the whole allowance twice. The 1,500 paid / 1,500 earned scenario is still a scenario, not an approved production cap.

## Source and implementation

- `marketplace/clothing-fit-families.json`: reviewed pair map, source audit reference, exceptions and policy.
- `marketplace/clothing-fit.ts`: source-cut priority, exact shared-table eligibility, unresolved suffix guard and grouping after filters.
- `catalog.ts`: preserves all inventory records; `filterProducts` returns exact records and `browseProducts` groups style entries only.
- `ClothingFitPicker.tsx`: links exact fit SKUs. No color-index matching across fits.
- `scripts/export-clothing-fit-catalog.mjs`: exports all retained source IDs, concepts and unresolved edition fields to a review JSON and HTML.
- Workspace evidence: `outputs/ww-clothing-fit-audit-20261108/clothing-fit-pairing-audit.json`; `outputs/ww-female-leggings-discovery-20261108/findings.json`; `outputs/ww-native-wearables-20261107/native-render-bindings.json`.

## Remaining catalog release work

Resolve fit for the 95 unconfirmed records. Six especially misleading suffixes are BTWR_010_F, JCKT_001_F, JCKT_002_F, JCKT_N30_F, TPWR_002_A_F and TPWR_002_F. Neither the suffix nor a model photo establishes a female source binding. Requested V04 yoga leggings are still unidentified; BTWR_003_F is trousers. Validate each final garment/material on its intended avatar, with clipping and layering checks. Approve fit-specific edition rights, caps and metadata after those checks.
