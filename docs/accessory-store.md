# Accessory store preview

## Current local store — 7 November 2026

The active checkout is `sites/wilder-fashion-review/checkout`, served locally at `http://127.0.0.1:8791/store`. No public site or contract deployment is part of this update. The older fashion-only notes below are retained as history; this section supersedes their browsing and variant counts.

The current storefront has **214 products**: 163 curated clothing styles, 10 vehicle/rim products, 22 furniture objects, 16 statues and 3 totems. The 29 latest removals are an explicit ID exclusion list in `marketplace/storefront-curation.json`; source discovery archives remain intact. The Temerario preview is excluded. Vehicles include the two existing complete-car concepts and eight selected rim designs.

`/store` keeps the shared site navigation, display typeface, charcoal surfaces and orange accents. The store landing vehicle hero is removed; its source media and the vehicle landing page remain intact. Shop the Simulation now opens with a horizontally scrolling portrait category rail (four visible plus a next-card preview on desktop). Each campaign has a dedicated headline panel above its image, a restrained slate, rust, olive or charcoal tone, and a direct category link. Approved lifestyle photographs and individual product images are mixed across the rail. Four compact themed cards with headlines above their images follow, then eight individual product cards. Selecting a category opens its product list. `/store/browse` includes all departments and loads 24 more products as the visitor scrolls, with a keyboard-accessible fallback and a finite end state. Search and filters reset pagination.

Product pages use a dominant image, compact finish swatches and a consistent detail column. The shared “In Wilder World” section explains intended use, proposed contents, recorded compatibility, readiness, delivery and source identity for all 214 retained products. The evidence helper distinguishes exact source records from family references and visual concepts; an identified asset is not a “game ready” or live-release claim. Avatar flags and accessory-combination restrictions are preserved, saved apartment placements do not grant placement eligibility, rim quantities and fitment stay unresolved, and the Trinity reference offers no new mint. Evidence is reproducible from `tools/build_product_game_evidence.py` and summarized in `outputs/ww-product-game-details-20261107/evidence-audit.json`.

The current campaign imagery uses 16 new catalog-referenced Wiami editorial scenes: 15 category covers, including a dedicated Rims entry within Vehicles, and an additional desk/coffee-table interior. Fashion mixes retained wearable products with ordinary clothing on adult male and female models. Furniture, sculptures, rims and totems have distinct interior, gallery and product-detail treatments. The four smaller themed cards use outerwear, workspace, rim and pendant imagery. These images are separate from approved product/color photography and do not establish exact game geometry, variants, fitment or ownership. `/images/marketplace/wiami-campaign-v1/` contains the optimized assets; `marketplace/campaign-media.json` maps scenes to retained product IDs. Full reference paths, prompts, PNG masters and review records are preserved under `outputs/ww-wiami-campaign-20261107`.

Every product retains **nine planned material concepts** (1,926 total). Visible clothing choices are limited to the original 489 approved photographs and additional reviewed edits that preserve their presentation. The six Undertow Ledger additions now derive directly from SILT SHIFT, with the same silhouette, pose, panels and framing. Native clothing studies that change that presentation are withheld from storefront swatches and kept in the source archive. The original clothing routes and newer product routes support selection URLs; the demo bag retains only an available selected clothing option. These previews do not confirm implemented Unreal variants, onchain editions, supply, game effects or mint permission. The launch purchase model is one explicitly approved selected color, not an automatic bundle of all nine; checkout remains a local demonstration.

The prior native batch covered 140 clothing styles. Native source fidelity did not establish continuity with the initial approved product photographs, so those studies no longer qualify as storefront previews. The other 23 styles already have reviewed reference edits, and Undertow Ledger brings the corrected total to 24. The remaining 139 styles (834 added images) require reference-based replacements. Original assets and source bindings remain intact, with visual fidelity tracked separately from native geometry evidence. The two cars and Trinity material studies are also image concepts. Native and generated paths are recorded separately.

Trinity opens on its original officially published artwork and stays an existing collectible reference. Its nine derived material studies do not grant new editions or colors to owners. The two native chain products are a chain with pendant and a chain-only style. Totems retain their own web section within the Clothing collection architecture; this update adds no fourth contract.

The patterned Study rug (`home-object-050-sm-carpet`) now uses the current Unreal `SM_Carpet` / `MI_Carpet01` source texture. Study Original is the default; eight textile color studies preserve the authored medallions, floral border, UVs and normal detail. These studio images use different illumination from the apartment scene. Source packages were not saved or modified; provenance and validation are in `outputs/ww-patterned-rug-20261107`.

Existing clothing preview prices are retained. Undefined prices, supply limits, legacy ownership mappings, fitment and game compatibility remain unresolved. No payment, mint or game entitlement is triggered by changing a material preview.

Current evidence is separate from the historical token handoff:

- `outputs/ww-nine-materials-20261107/material-variant-registry.json`: all product/concept/source mappings and unresolved game/token fields.
- `outputs/ww-reference-fidelity-20261107`: current presentation audit, withheld native archive and reference-edit queue. Prior image coverage in `ww-nine-materials-20261107` is not proof of approved storefront presentation.
- `outputs/ww-native-wearables-20261107/native-render-bindings.json` and `execution-summary.json`: reviewed native assemblies, actual export execution and source-integrity checks.
- `outputs/ww-fashion-materials-20261107/image-generation-manifest.json`: generated clothing references, full prompts and output paths.

## Historical fashion handoff — 6 November 2026

Updated 6 November 2026. The active collection contains **163 individual accessory products across 68 families**, linked to **173 active source SKUs**, with **489 proposed colorways** and **824 worldbuilding recipe lines**. The original source archive remains intact.

`/store` is a **fashion-only catalog** with the supplied video hero and individual accessory cards. The hero has one **Shop the collection** CTA linking to the existing `/vehicles` landing page; the global header also provides vehicle navigation. The catalog has no Vehicles toggle or vehicle cards. Colors are selected with swatches that carry into `/store/[id]`; there are no style or configuration toggles. Product pages follow the vehicle gallery and purchase layout, and existing family links resolve to an available individual style.

The store uses the site's shared font tokens: D-DIN display headings, the shared sans-serif body font and monospace metadata where appropriate. Floating product images sit on the same **#101113 charcoal** as the surrounding product presentation. A local demo bag supports selected colors, quantities and a preview confirmation; it takes no payment and creates no real order. Accessory retail prices remain undefined.

## Collection and identity

- `catalog.json` preserves all 318 original thumbnail SKUs in 117 provisional source families.
- `merchandising.ts` and `store-curation.json` apply the requested exclusions. The current creative catalog has 68 active families and 173 active source SKUs. Its historical 180-SKU scope includes the seven most recent removals.
- `individual-products.json` and `fashion.ts` provide 163 separate storefront products. Hats, glasses, jackets and other source styles have their own cards and routes. Distinct chestpieces, gloves, capes and pouches remain separate products; a defined pair remains one product.
- `fashion.json` supplies names, brands, collections and stories while preserving original SKU identifiers. Native game accessory types, equipment information and source provenance remain in the catalog sheet and source map.
- `colorway-images.json` connects reviewed color photographs to swatches. Each active product has three proposed colors, totaling 489 concepts. Changing color keeps the individual product and source SKU.
- `image-exceptions.json` withholds `XTRA_010_B` because its thumbnail contains only a base character. Its source record remains available for review.
- Plain jeans (`BTWR_003`), Ceremony Rig (`XTRA_005`) and all earlier requested exclusions remain hidden. `HDWR_FRD` is distinct from removed Frank/`HDWR_FRN`.
- GravGlove remains reserved for later gameplay work in [gameplay-backlog.md](gameplay-backlog.md).

The latest seven removals are:

| Source SKU | Removed product |
| --- | --- |
| `FTWR_002` | Kill Switch |
| `FTWR_002_A` | Kill Switch / 02 |
| `FTWR_003_A` | Pavement Choir / 02 |
| `FTWR_004` | Grave Courtesy |
| `HDWR_014` | Procession Error — hardhat |
| `HDWR_014_A` | Procession Error / 02 — hardhat |
| `MASK_004` | Blank Deposition |

**Grave Courtesy / 02 (`FTWR_004_A`) remains available and is labeled Women following explicit user confirmation.** Removed source assets and previous renders are retained in the archive.

## Brands and browsing labels

The seven current proposed labels are **MOTOR DRIP**, **UNION TIDES**, **2020 VISION**, **MERCY STATIC**, **AFTERSAINT**, **PALM GHOST** and **HEX COMMA**. Their existing internal brand IDs remain stable. These names and stories are creative proposals, not established game canon.

The storefront displays **Headphones** while preserving the backend category key `Jewelry`. Men and Women browsing includes shared Unisex products. `gender-fit.json` records the basis of each label: 50 styles have exact exported support for both HM/HF body compatibility, 112 use a proposed Unisex merchandising default, and `FTWR_004_A` is Women by user confirmation. These are 162 Unisex products and one Women product. A default label does not assert confirmed game fit; rig compatibility is kept separate from merchandising labels.

## Photography and catalog sheet

`public/images/accessories/isolated` contains floating product photographs without the source character, displayed on #101113 charcoal. Racing suits are presented as garments without separate shoes or gloves. Transparent PNG masters preserve source-visible geometry, colors and material identity; obscured surfaces reconstructed from small thumbnails still need asset-owner review before launch.

The workspace's `outputs/ww-fashion-catalog` contains the creative and individual catalogs, game-source map, gender-fit evidence, PNG masters, prompts, review records and `Wilder-World-Fashion-Catalog.xlsx`. The workbook documents Products, Variants, Brands, Recipes, Components, Images, Source SKUs and Removed records; the pricing draft is maintained separately from live price fields. The current active scope is 489 proposed color/material variants and 824 recipe lines.

Native game types, compatibility flags, render-mesh component indexes and provenance are retained where exported. Missing source information stays unknown. Render-mesh indexes are not crafting quantities. Proposed recipe lines are worldbuilding context with no gameplay implementation. Concept IDs remain distinct from production SKUs; no production material mapping, size, rarity or gameplay effects are implied.

Color PNG masters live in `colorway-images`; reviewed WebP derivatives live in `public/images/accessories/colors`. The final synchronization confirms **489 of 489 active colorway renders reviewed, with zero awaiting refinement**. `sync-colorways.mjs --require-complete` checks that every active concept has an approved render record. `colorway-delivery-status.json` and `image-jobs-colorways-*.json` retain the delivery and review evidence. The sheet includes master paths, storefront paths and image exceptions. Completed image review does not establish game asset implementation or replace final asset-owner approval.

## Proposed pricing

The selected direction mixes accessible basics with premium statement pieces. The draft in `outputs/ww-fashion-catalog/pricing-research.json` recommends:

| Tier | Proposed USD band | Basis |
| --- | --- | --- |
| Essentials | $3–7 | Everyday accessories and simple wardrobe pieces |
| Signature | $9–12 | Distinctive silhouettes and substantial garments |
| Statement | $15–19 | Selected hero outerwear, helmets and complete suits |

Every color of a product has the same proposed price. Gender, brand lore and proposed crafting materials do not add a surcharge. No scarcity, resale value or gameplay benefit is assumed. Category-specific recommendations and basket checks remain draft research; accessory catalog and checkout prices are still blank. Purchase entitlement—one selected color or all colors—must be defined before checkout.

The existing Radeon Ghostline **$19** and Vera Solis **$59** displays are working anchors only: `ghostline.ts` explicitly marks them as **placeholder pricing to confirm before launch**. They are not evidence of completed sales or pure cosmetic price comparisons.

Official comparison sources, checked 6 November 2026, include [Fortnite's cosmetic shop](https://www.fortnite.com/item-shop), [Epic's current V-Bucks pack pricing](https://www.fortnite.com/news/fortnite-v-bucks-price-increase) and the [FFXIV USD store](https://store.finalfantasyxiv.com/ffxivstore/en-us/?currency=USD&lang=en-us). The research file records exact products, dates and limitations, including currency normalization and the FFXIV indexed-store snapshot. These observations support a pricing hypothesis rather than a sales forecast.

## Validation and launch work

Run `npm run typecheck`, `npm test -- src/sites/wilderworld/accessories/catalog.test.ts src/sites/wilderworld/accessories/product-detail.test.tsx` and `npm run build`. Catalog and page checks cover source preservation, exclusions, individual identities, routes and family aliases, swatches, gender filtering, fashion-only browsing and the hero link. The render completion check is separate.

Before launch, obtain final asset-owner approval, approve the creative proposals and product-level price assignments, map approved color/material treatments to exact game assets, and define compatibility, ownership and delivery. Checkout integration is not part of this preview.

The store catalog contains **163 individual fashion products**. Vehicle offers remain on their existing landing page and are not part of the store grid. Changes remain local until published.
