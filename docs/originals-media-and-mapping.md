# Originals delivery and mapping audit

Local implementation, 2026-11-07. The historical token handoff has not been modified.

## Thumbnail delivery

`scripts/originals-media-cache.mjs` listens only on `127.0.0.1:8793`. Run it alongside the local store. The worker rewrites original artwork URLs only for loopback requests with `STORE_MODE=local`, using `/api/market/media?cid=…&w=640` for browsing and width 1280 on product detail. It retains the original URL in `originalImage` and never changes token IDs, contract IDs or CIDs. Public/production requests do not enable this helper.

The helper accepts only an IPFS CID plus a restricted file path, and widths 320, 640 or 1280. It fetches one fixed HTTPS gateway, rejects redirects, never forwards browser credentials, limits input to 20 MiB and 40 million pixels, and runs at most three conversions concurrently with a bounded queue. PNG/JPEG/WebP inputs become proportionally resized WebP images. Identical requests coalesce; immutable renditions and ETags persist under `.tmp/originals-thumbnails`. The cache has a 1 GB write ceiling. If the helper is unavailable or full, the worker redirects to the same original CID at the fixed gateway.

All 50 observed Wheels explorer records had no optimized thumbnail. A real sampled original (CID `QmXf7WzpchkZxNnMkHZqJv3k18dCc6sXyccCfaBaNeFRma`) was 5,558,892 bytes. Its 640px rendition is 22,324 bytes: first request 824 ms and subsequent local cache hit 8 ms in this measurement. This is one sample, not a guarantee for cold IPFS content. Only requested artwork is fetched; no full-collection media download occurred. Arweave and other provider images continue using their source URLs.

## Complete source-to-token audit

`source-token-audit.ts` and its executable test consolidate all 226 current products and 2,034 planned concept variants in `outputs/ww-edition-supply-20261108/New-Store-Source-Token-Audit.json`. The current edition proposal is 3,000 units per product, approximately 333.333 per variant, totaling 678,000 proposed units. Each variant retains its existing rarity assignment and proportional supply share. Every product retains source IDs. The unchanged historical registry still contains 163 curated fashion products and 489 original color concepts. Current restoration and expanded products are tracked separately: 178 current products match historical registry entries; 48 need a canonical launch registry record. Thirty-five products lack a native asset path in their current source/evidence fields, including ten physical Frank Wilder references awaiting digital models. These remain unresolved, not game-ready claims.

Each row carries logical collection, web department, source IDs/assets, native evidence, exact compatibility references, all concept IDs, proposed rarity/supply and null approved token/edition/game-material mappings. Rims and vehicles share Vehicles; clothing and totems share Clothing; furniture/statues share Furniture. Trinity stays archived and unavailable for new minting. Fifteen original collection identities are recorded separately using exact chain/contract/token provenance; existing ownership does not grant new edition rights.

The separate current registry is `outputs/ww-edition-supply-20261108/Collection-Product-Registry.json`: 226 explicit draft product records and 2,034 concepts, including all 48 additions without historical entries. It names the three contract families, preserves physical/native source provenance, and carries unapproved usage, fitment, placement, price, supply, token/material and delivery fields. It also identifies the exact edition-proposal version and records the proposed aggregate units separately from null approved caps. It is a complete current draft registry, not mint configuration. Incomplete rim-set contents and game-asset bindings stay unresolved. The previous audit in `outputs/ww-originals-data-20261107` and registry in `outputs/ww-current-store-registry-20261107` remain historical snapshots and are no longer overwritten by the current audit.

## Fulfillment separation

The existing `CollectionFulfillment` domain requires an approved server offer and authenticated wallet/game account. Payment confirmation validates provider evidence against the order. Mint settlement separately validates a finalized receipt, recipient, contract, product, edition, selected finish, unique event and token. Delivery separately checks current ownership and performs an idempotent game grant/revoke. Delivery failure retries do not remint or charge again. One purchase grants one approved finish, not all nine visual concepts.

All current new release caps, edition/token assignments and material bindings remain unapproved. Production payment, canonical receipt, durable repository/outbox and game-delivery adapters are not connected; secondary-sale integration also remains a launch task. Local account sales explicitly record simulated payment/settlement and `not_issued` game entitlement. New local review roles, votes and test purchases never establish production proof.

## Validation

The final combined backend/review UI/media/mapping/fulfillment run passed 89 tests across 11 files. Two standalone cache/resizer tests and TypeScript also passed. The draft registry was regenerated and verified separately after that run. Parent handles the final integrated build and browser QA.
