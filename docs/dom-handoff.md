# Dom — Wilder World store handoff

**Goal:** take this shopping experience into production while Frank continues refining creative and products. Preserve the WW design. Finish frontend acceptance first, then contracts and JSON metadata.

**Review:** [current site](https://wilder-world-fashion-review-20261106.frankwilder.chatgpt.site/) · [lifestyle approvals](https://wilder-world-fashion-review-20261106.frankwilder.chatgpt.site/lifestyle-review/). This branch captures published v27; master has not been changed.

## What you're receiving

Storefront, browse/filter navigation, Genesis and Packs shopping, grouped editions, product pages, mobile sticky buy, profile/wallet screens, and local listing/buying/review workflows. Source and product media are included. [README](../README.md) has setup; [validation](../handoff/VALIDATION.md) records what passed and what remains.

Current catalog: **221 source products, 211 shopping entries, 1,989 visual variants**. Ten supported male/female pairs share a style page while preserving separate fit/SKU/edition identities. One purchase grants one selected fit and finish. Source fit evidence is not final in-game compatibility approval.

**Product photos stay as-is. Product-page lifestyle photos are held for Frank's approval** (117 review images; none approved yet). Homepage campaign art remains visible. Do not restore lifestyle galleries automatically. Creative/catalog refinement continues separately from your integration work.

## Priorities

1. **Frontend acceptance:** reproduce the build, review regression results, and test real iOS/Android browsing, search, variant selection, back-to-grid and sticky purchase behavior.
2. **ZERO accounts + inventory:** replace local auth with production ZERO login/profile/photo sync; link self-custody wallets with verified signatures and current Ethereum ownership. Implement unlink/transfer revocation and game entitlement reconciliation.
3. **Real markets:** connect authoritative ownership, listings, offers, trades and history. Family pages aggregate discovery; selected fit/finish/rarity editions have distinct markets. Execute against the exact ERC721 copy or ERC1155 balance, never rarity alone.
4. **Commerce + delivery:** buyers use USD or WILD; seller listings are WILD-only. Primary WILD quotes vary with USD prices; resale WILD asks stay fixed. Marketplace fee direction is **1% seller fee**. Add expiring quotes, atomic fills, cancellations/refunds, moderation and recovery. Keep payment confirmation, chain settlement and game delivery separate and retry-safe.
5. **Contracts + metadata:** implement the **five-contract target below**, then approve the final catalog and export content-addressed JSON/media. No live minting, money movement or public-chain deployment is enabled by this handoff.

## Latest contract structure

| Contract | Current products |
| --- | ---: |
| Vehicles — complete vehicles **and rims** | 10 (2 + 8) |
| Clothing — apparel and wearable accessories | 166 |
| Furniture | 21 |
| Statues | 15 |
| Totems | 9 |

This **supersedes** the earlier three-contract proposal. The bundled Solidity sources still implement that older baseline; separate Statues/Totems, update kind restrictions, mappings and tests before release. See [contract implementation delta](collection-contracts.md).

## Decisions still with Frank / service owners

Final creative/catalog acceptance, fit/fitment and game-ready evidence; production prices and edition caps; paid versus earned allocation; ZERO/API ownership; payment/conversion and royalty rules; chain/governance and independent security review. The 3,000-per-product edition plan and 1,500 paid / 1,500 earned scenario are **proposals**, not approved mint settings. Reviews and charts currently include sample content, not real trading activity.

Weapon rendering remains paused. Building work remains one verified native pilot before any batch. Totem 3D intake and the unresolved female leggings source remain content/game tasks, not reasons to invent replacement assets.
