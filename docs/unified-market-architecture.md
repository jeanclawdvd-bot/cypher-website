# Unified Wilder World shopping and marketplace

This is a local integration design. No public deployment, contract configuration,
payment, signature, mint or entitlement delivery is performed by this work.

## Local implementation status — 2026-11-08 UTC

- `/` is the Wilder World shopping home; the former landing page remains at
  `/discover`, with site sections accessible through the footer. The shopping
  navigation retains the logo home/glitch interaction and Play Now action.
- `/store/market` embeds the existing collection browser inside Wilder World.
  `/market` redirects with its query parameters preserved; existing collection and
  token links remain supported. The active source remains
  `sites/wilder-fashion-review/checkout` and the local preview remains port 8791.
- New clothing and object product pages include the selected edition proposal,
  market activity/order-book/price-history interface, local bid/listing drafts,
  and ratings/reviews with filters. A separate local account backend now persists
  profiles, test inventory, listings, simulated transfers and pending reviews.
  Real trading, production accounts and game delivery remain unconfigured.
- New local resale listings use the approved 1% seller marketplace fee and no
  buyer marketplace surcharge. Server-derived fee snapshots persist through
  settlement and retries; existing test listings retain their original zero-fee
  terms. A completed local sale is still simulated. Primary-release revenue and
  secondary-sale platform fees are separate accounting streams.
- Homepage category, editorial and original-collection cards use square corners.
  Search has an anchored, keyboard-accessible department selector; selecting a
  department preserves the query and submitting it uses the matching browse route.
  The 15 original collection links retain their independent scrolling rail.
- Read-model validation covers exact identity/currency, trade finality,
  transaction-log uniqueness, chronology, bounded history windows and stale order
  exclusion. Quote deadlines invalidate displayed asks/bids. No read-model state
  grants submission permission.
- The review adapter filters to moderated records belonging to the product and
  known variants. Purchase and ownership evidence are distinct server-asserted
  records. Local review moderation, audited decisions and reversible helpful votes
  are implemented with separate roles. Browser drafts and pending submissions
  neither publish reviews nor affect ratings. Local review data never receives
  production verification badges; production review identity remains unconnected.
- Rarity assignments cover 221 current products and 1,989 planned variants, for 663,000
  proposed units. This is an allocation proposal, not approved or minted supply.
- Current visual coverage is 1,989 available variant previews; all 221 products
  have nine, with gallery or product-specific editorial coverage. All 3,701
  referenced media files passed a file/decode/dimension audit on November 8;
  this technical check does not approve their creative quality or source fidelity.
  The nine retained Frank Wilder products have 81 pendant-only finish images.
  Queen Isis and the two native chain entries are excluded from the storefront;
  historical chained photographs do not count as replacement previews.
- The supply change passed five focused edition tests and a framework build;
  the product page visibly shows 3,000 total and the selected rarity quantities.
  Subsequent source/token and current-registry reconciliation passed six tests
  across two suites and preserved the then-current 226 product and 2,034 variant
  identities. Those validation counts precede the later curation removals;
  the current catalog is the 221-product selection described above.
- Separate local UUPS collection, registry and production-settlement implementations
  now satisfy the recorded upgradeable architecture direction. Constructor
  implementations remain regression baselines. See `contracts/collections/UPGRADEABLE.md`
  at workspace root for local tests and the privileged-upgrade trust boundary.
- Validation logs record two focused passing runs (48 tests across six files and
  28 tests across six files), a successful framework build and no TypeScript
  diagnostics. These are separate runs, not a claim of 76 unique tests. Final
  desktop/mobile browser verification is handled separately by the active task.

See workspace `outputs/ww-unified-market-20261107/Implementation-Report.md` for
the exact validation evidence and outstanding integration work.

## Persistent local account boundary

`src/lib/store-backend` and `migrations/store/0001_local_store.sql` implement the
local HTTP account service. `/store/account` manages the profile and test items.
The service requires `STORE_MODE=local`, an exact loopback hostname and `STORE_DB`;
the generated local Wrangler configuration retains only runtime/assets settings
and a dedicated nonremote D1 binding. Production hosting configuration is unchanged.

One test grant per account creates three catalog-linked local copies. It neither
consumes the rarity proposal nor claims legacy ownership. SQLite constraints and
triggers serialize listing availability, cancellation, usage locks and transfer.
Purchase retries use buyer-scoped request fingerprints. Each sale explicitly
records simulated payment, simulated settlement and no issued game entitlement.

The security suite executes the actual SQL migration and HTTP handler against
in-memory SQLite. It covers concurrent buyers, concurrent identical retries,
cancel/purchase and grant races, self-buy and nonowner rejection, price/field
validation, CSRF, session revocation/expiry, throttling, pending moderation and
production gating. Run the separate loopback HTTP smoke test against Wrangler to
verify runtime/D1 compatibility. See `docs/local-store-accounts.md` for commands.
The final local backend run passed 24 tests across three files; the actual
Wrangler/D1 lifecycle passed nine grouped checks on port 8792. The latter includes
two buyers racing one listing and a rejected cross-origin request followed by a
legitimate mutation. These results are local validation, not production approval.

## One shopping experience, distinct asset authority

Use the existing Wilder World navigation, typography and category discovery for
both new products and existing collectibles. Keep legacy collection/token links
resolvable. A shared visual card must retain the underlying asset's provenance;
merging the interface does not merge contracts or grant new mint rights.

- The new store catalog is `src/sites/wilderworld/marketplace/catalog.ts`.
  Store product IDs, original source IDs and proposed visual variant IDs remain
  distinct from approved onchain edition and token IDs.
- Existing marketplace collections are configured in `src/lib/wilderCollections.ts`:
  11 Ethereum collections using OpenSea and four Z-Chain collections using the
  indexer (chain ID 9369). These configured identities require launch verification
  against their actual contracts. Existing ownership, supply and rarity stay intact.
- Vehicles and rims are separate web categories under the same new Vehicles
  contract. Clothing and Totems are separate web categories under the same new
  Clothing contract. Furniture uses its own new collection. Removed Trinity Totem
  sale entries remain historical references, not newly issuable products.
- A legacy NFT is keyed by chain, collection contract and token ID. A new product's
  proposed color ID alone is never an onchain identity. An edition-wide market
  requires a separately approved edition grouping and a verifiable token membership
  rule; an arbitrary group string cannot authorize a trade.

## New edition proposal

`limited-editions.proposal.json` persists an explicit assignment for every current
new-store product and planned variant. The separate handoff is
`outputs/ww-edition-supply-20261108/Edition-Rarity-Proposal.json` at workspace root.
The prior `outputs/ww-unified-market-20261107/Edition-Rarity-Proposal.json` is retained
as a historical snapshot of the earlier supply proposal.

| Existing Unreal tier | Variants per product | Proposed units per variant | Product supply share |
| --- | ---: | ---: | ---: |
| Common | 2 | 600 | 40% |
| Uncommon | 2 | 450 | 30% |
| Rare | 2 | 270 | 18% |
| Epic | 1 | 240 | 8% |
| Legendary | 1 | 90 | 3% |
| WILD | 1 | 30 | 1% |

The proposal totals 3,000 units per product and averages 333.333 units per variant.
Percentages describe lifetime supply allocation, **not reveal odds or drop rates**.
Tier names/colors come from Unreal's `EPackRarity` and `GetRarityColor`; the supply
allocation is a new proposal, not an inherited salvage or shard issuance schedule.
Every record remains `status: proposed`, `approvedSupplyCap: null` and
`mintAuthorized: false`. It must not be used as an executable configuration manifest.

One purchase grants one selected color edition. Treasury, sales, promotions,
production and reward allocations all fit inside the same product and edition
caps. Unique outstanding reservations reduce available inventory. Settlement
converts a reservation into a mint once; expiry releases only an unminted slot.
Lifetime minted counts never decrease when tokens are burned or transferred.

## Market reads and preview interactions

`market-data.ts` defines read adapters, exact atomic-money strings, scoped token
identities, orders, finalized trades and explicit unavailable/sample states.
`ProductMarketPanel.tsx` consumes a validated adapter snapshot. The default adapter
is unconfigured; it supplies no invented orders, floor price, volume or sales.
The opt-in sample chart is visibly marked and contains no executable orders.
Preview bid/listing drafts are local, unsigned and unsubmitted.

Production adapters must enforce:

- Exact product/variant-to-token mapping; chain and collection validation; token
  ID or approved edition grouping. Never mix similarly named products or contracts.
- Integer atomic currency values and explicit currency decimals. Compare/group
  only the same chain, currency contract, symbol and precision. Never cast a token
  ID or monetary amount to a JavaScript floating-point number.
- Order provenance, expiry, cancellation/fill state, maker identity, current
  ownership/approval and freshness. Unknown or stale execution state fails closed.
- Finalized trade provenance, chain/transaction/log uniqueness, valid timestamps,
  reorg handling, defined historical coverage window and consistent unit-price
  versus total-price semantics. No mixed-currency charts or unlabelled conversion.
- Verified transfer eligibility. A rim installed on a vehicle, placed furniture
  or equipped item must not simultaneously become independently sellable or
  consumable. Buy-side acceptance must recheck the seller's token and usage lock,
  even if the buyer has no ownership state for that item.

## Production settlement boundary

Keep three independent states: payment confirmation, authorized mint/transfer
settlement, and game entitlement delivery. A browser success screen is not proof
of any of them. Settlement needs globally unique order/job references, exact
recipient and edition binding, replay protection and retry-safe delivery.

The eventual signed-order executor must validate chain/domain, maker nonce,
expiry, signature (including contract-wallet signatures), price/currency, fees,
quantity, allowance, ownership and usage locks immediately before execution.
Cross-channel cancellation and partial fills must be reconciled. Buying an
existing collectible transfers its token; it does not mint another copy.
Resources, Components and Blueprint recipes require separate validated output
edition rights and cannot expand a legacy supply cap.

## Remaining launch decisions

Local recovery implementation is now available in `docs/durable-local-fulfillment.md`:
a separate Node SQLite repository persists evidence claims and a leased reconciliation
outbox. It is not connected to checkout and is not a distributed production repository.
The future game gateway must honor stable idempotency keys and revocation tombstones.
Frank Wilder model intake is documented in `docs/frank-wilder-totems.md`; file receipt
does not approve source rights, avatar fit or game delivery.

The current runtime catalog has 221 priced products, using the
`marketplace/preview-prices.json` overlay and the current curation exclusions.
At 3,000 proposed units per product, that selection totals 663,000 units and a
$6,204,000 gross sellout scenario. This is not a revenue forecast or launch approval.
The earlier approval snapshot remains at `/reviews/pricing/index.html`, with
source `outputs/ww-preview-prices-20261108/Applied-Preview-Pricebook.json` in the
workspace. It records the then-current 226 products, 678,000 proposed units and
$6,327,000 scenario before subsequent removals, including 63 approved preview-price
additions and 163 retained prices. It is historical evidence, not the current
storefront inventory.
Production prices remain unapproved, and checkout, minting and game entitlement
delivery remain disabled. The original `Full-Pricebook-Draft.json` is preserved
byte-for-byte as the historical basis for approval.

1. Verify each existing collection address, standard, chain and metadata mapping;
   confirm authenticated OpenSea/indexer credentials, API scopes, available
   order/history coverage and operational rate limits. Missing credentials remain
   an explicit empty/unavailable state, never a fabricated live market.
2. Choose the order/signature/settlement engine, wallet and custody integration,
   supported currencies, fee policy, transaction finality and indexing strategy.
   Existing browse adapters do not themselves enable purchase/listing execution.
   Add authoritative inventory, ownership, approvals, installed/placement locks,
   order cancellation/partial-fill tracking and payment-to-entitlement reconciliation.
3. Approve the proposed new edition assignments/caps and reserve allocation,
   production rights, pricing and release plan. Complete game models, fitment and
   material compatibility independently; rendered concepts do not prove game readiness.
4. Review the implemented UUPS architecture before contract launch. The workspace's
   `outputs/Wilder-Dom-Data-Handoff/Contract-Upgradeability-Requirement.json` records
   an all-new-contract upgradeability requirement, implemented separately in
   `contracts/collections/src/upgradeable/`. Production governance, upgrade delay
   and independent security review remain unresolved; local fixtures are not a
   production deployment or governance configuration.
5. Any approved proxy strategy must preserve balances, ownership, identity maps,
   lifetime minted counts, reservations, edition/product caps and replay state.
   Initialize proxies atomically, lock implementation initialization, restrict
   upgrade authority separately from fulfillment and test storage migrations.
   An upgrade must not reset mint counters, reopen burned supply, mutate a sold
   edition's identity or bypass a lifetime cap. A proxy's privileged implementation
   replacement can defeat code-level invariants: specify whether cap enforcement
   lives in a non-upgradeable external guard, whether cap-increasing upgrades are
   technically prohibited, or which explicit governance trust is accepted. Do not
   promise immutable caps while leaving unrestricted upgrade authority.
6. Complete integration, adversarial and independent security review before any
   funds, public contract deployment or live fulfillment are enabled.
7. Connect production review identity and server-verified purchase/ownership proofs.
   Local authenticated accounts, moderation, abuse/rate controls and helpful-vote
   persistence are implemented and remain isolated. Client drafts and provider-shaped
   data are not production verification authority.
