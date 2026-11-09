# Local store API

See [local-store-accounts.md](../../../docs/local-store-accounts.md) for the build, migration and local server instructions. Apply all migrations in `migrations/store/`, including `0006_local_profile_photos.sql`.

`handleStoreApi(request, env)` returns `null` outside `/api/store/v1`. Requests inside that prefix require both `STORE_MODE=local` and a loopback hostname. A missing database fails closed. ZERO is the intended shared profile provider, but no production identity service is connected.

Every successful JSON response contains `mode: "local"`; the private profile-photo read returns image bytes. Errors use `{ "error": { "code": "…", "message": "…" } }`. Responses are not cached. Mutations require a matching `Origin` and `application/json`; authenticated mutations also require `X-CSRF-Token` from the current session response. Request bodies are bounded to 16 KiB except the photo PUT route's 350 KiB transport cap. Fields not explicitly accepted are rejected.

| Method | Relative path | Input / result |
| --- | --- | --- |
| POST | `/register` | `email`, `password` (12–128 characters), `displayName` (1–60). Returns user, CSRF token and session cookie. |
| POST | `/login` | `email`, `password`. Rotates the current session. |
| GET | `/session` | User or `null`; CSRF token only when signed in. |
| POST | `/logout` | Empty object. Revokes the current session and clears its cookie. |
| GET | `/account` | User, inventory, seller listings, purchases, sales, own reviews and authoritative `seedClaimed` status. |
| PATCH | `/profile` | `displayName` and/or `bio` (up to 500 characters). |
| GET | `/profile/photo` | Private JPEG for the signed-in account only. Never accepts another account's identifier. |
| PUT | `/profile/photo` | `dataUrl` containing the profile editor's JPEG output, at most 256 KiB decoded and 512×512 pixels. Returns the updated user. |
| DELETE | `/profile/photo` | Empty object. Removes the authenticated account's photo and returns the updated user. |
| POST | `/seed` | Empty object. Once per account, creates three explicit test copies using current catalog product and variant identifiers. |
| GET | `/listings` | Optional `productId` and `variantId` query filters; returns at most 100 active local listings. |
| POST | `/listings` | `itemId`, `currency: "WILD"`, canonical decimal-string `amountAtomic` (1–uint256 max, 18 decimals). Only the authenticated owner can list an unlocked item. |
| POST | `/listings/:id/cancel` | Empty object. Seller only; an already-cancelled listing is returned unchanged. |
| POST | `/listings/:id/quote` | `paymentCurrency` (`USD` or `WILD`), `expectedCurrency`, `expectedAmountAtomic`. Returns a buyer-bound immutable five-minute simulated purchase quote. |
| POST | `/listings/:id/buy` | `idempotencyKey`, `quoteId`, `expectedCurrency`, `expectedAmountAtomic`, `paymentCurrency`, `expectedPaymentAmountAtomic`. Exact matches required. Returns `sale` and `replayed`. |
| POST | `/inventory/:id/lock` | `usage`: `unlocked`, `equipped`, `installed` or `placed`. An explicit local state simulation, not a gameplay integration. Active listings must be cancelled first. |
| GET | `/reviews` | Required `productId`. Published local reviews only; pending reviews never affect ratings. |
| POST | `/reviews` | `productId`, `variantId`, integer `rating` (1–5), `title` (1–120), `body` (1–5,000). Creates a pending review, visible to its author in Account. |
| GET | `/wallets` | Authenticated user's linked wallet proofs; asset synchronization and game delivery are `unconfigured`. |
| POST | `/wallets/challenges` | `address`, numeric `chainId: 1`. Returns a server-issued five-minute message-signing challenge. |
| POST | `/wallets/link` | `challengeId`, EIP-191 `signature`. Verifies the stored exact challenge and atomically links the wallet while consuming the nonce. |
| DELETE | `/wallets/:id` | Empty object. Linked account only; removes the link and invalidates its outstanding proofs for that address. |
| GET | `/moderation/reviews` | Moderator only. Optional `status=pending\|published\|rejected`; up to 200 reviews, excludes moderator's own submissions. |
| POST | `/reviews/:id/moderation` | Moderator only. `decision=published\|rejected`, `reason` (3–500), integer `expectedRevision`, `idempotencyKey` (8–128). Atomically records an immutable decision and advances the revision. |
| POST | `/reviews/:id/helpful` | Signed-in non-author only. `helpful` boolean; one vote per account, idempotent repeated vote, reversible. Published reviews only. |

Passwords use unique random salts and scrypt (`N=32768`, `r=8`, `p=3`, 32-byte output). The 24-hour opaque session cookie is HttpOnly and SameSite=Strict (Secure on HTTPS); only its SHA-256 hash is stored. Session expiry is checked for every authenticated operation. The CSRF value is independently derived from the opaque session token. Database rate limits apply to authentication, account writes and review submissions.

SQLite triggers and uniqueness constraints enforce one active listing per item, current ownership, unlocked state, immutable listing prices, no self-purchase and a single sale per listing. Inserting a sale atomically closes the listing and changes the local inventory owner. Idempotency is scoped to the buyer and fingerprints the listing, quote, expected ask/currency and expected payment amount/currency. Exact retries return the original result even after the quote expires; changed requests conflict. The expected amounts are confirmations only and must equal immutable server values. Seller ID, buyer ID, item identity, fees and the actual settlement amounts always come from server records.

These records are explicitly separate from real fulfillment: sale `paymentStatus` and `settlementStatus` are `simulated`; `entitlementStatus` is `not_issued`. No balances are credited or debited, contracts are not called, production supply permissions are not changed, and no game entitlement is delivered. Server-derived review context describes local test ownership/purchases only; it never becomes a verified blockchain ownership or verified purchase badge.

Current curation also gates trading: a product or finish removed from the current catalog cannot receive a new local listing, purchase quote or unsettled purchase. Removed offers are omitted from the public active-listing response. Account inventory, listing history and completed sales are retained, sellers can still cancel old listings, and exact retries of completed purchases still return their original result. Historical USD terms and fee snapshots remain unchanged for eligible items.

Grouped Originals support local moderated reviews at the exact family/edition identity. The separate `original-review-identities.json` index is generated from the complete grouping snapshot using `node scripts/build-original-review-identities.mjs`; a parity test checks all 174 families and 2,005 editions against that source. These subjects are not tradable inventory, do not create token ownership, and cannot receive local ownership or purchase verification. Listings and purchases still use `knownProductVariant`, while only review endpoints use `knownReviewProductVariant`.

## Marketplace fee preview

The approved rate is **1% deducted from a new WILD listing**, with no buyer marketplace surcharge, listing fee or minimum fee. `marketplace-fees.ts` computes exact integer fees, rounded half up once at the 18-decimal WILD atomic unit. A 100 WILD ask has a 1 WILD fee and 99 WILD seller proceeds. No accounting field uses a floating-point token amount.

Listings and sales store `amountAtomic`, `sellerFeeAtomic` and `sellerProceedsAtomic` as canonical decimal strings. Legacy `priceCents`, `sellerFeeCents` and `sellerProceedsCents` remain unchanged on USD rows and are null on new WILD rows. Fee snapshots are immutable. SQL implements decimal-string arithmetic for the fee/conservation checks, including amounts larger than SQLite's integer range.

Migration `0004_local_wild_currency.sql` rebuilds the two ledger tables transactionally, retaining IDs, ownership, dates, review-to-sale references and all historical USD amounts/fee terms. `0003` had assigned pre-fee records `legacy-zero`; `0004` preserves both those and subsequent 1% USD records. Historical active USD listings can still settle under their stored USD terms; they are never relabelled WILD. New listings require WILD at both HTTP and SQL boundaries.

### Purchase quotes

The **fictional** local rate fixture is `ui-demo-wild-usd-10c-v1`, 1 WILD = $0.10. This is not a live feed, oracle, token identity or production quote. The storefront and account preview share the same fixture. Dollar estimates are visually primary; WILD values and the demo-rate label are smaller.

The buyer selects USD or WILD, then requests a server quote. `store_purchase_quotes` records a random ID, buyer, listing, exact ask/currency, exact payment/currency, rate ID, rate numerator, creation and expiration. No request can supply the rate or calculated payment. Quotes expire after five minutes and cannot be edited or deleted. A sale has a unique quote ID and copies its payment snapshot. The API and the SQLite transfer trigger independently enforce buyer, listing, currency, amount and expiry. Changing currency requires a new quote and another confirmation.

A USD payment is rounded upward to a whole cent; seller proceeds remain the original WILD ask less the WILD fee. This rounding is shown before confirmation and is not called a buyer marketplace fee. WILD payments preserve all 18 decimals. The local simulation does not maintain balances or perform currency conversion, payout, payment confirmation, transaction signing or entitlement issuance. Production conversion and any rounding residual need an actual payment/settlement design.

Migration validation runs the entire file in a transaction. A final `pragma_foreign_key_check` assertion must pass before resetting SQLite's deferred constraint counter after the table rebuild. An invalid FK aborts the migration; no unresolved reference is silently ignored. Back up the local database before applying through the normal **local** migration command. Do not apply the migration against production.

The rate is a marketplace fee only: payment/network costs and existing collection royalties are not inferred, replaced or waived. The local seed catalog has no externally settled royalty calculation. Production fee recipients, settlement enforcement, actual payment costs and required legacy royalties still need their production adapters. This change grants no payment, minting or production trading permission.

Local moderator roles are separate database grants, not profile fields. Registration never grants them and there is no public role-management endpoint. `/session` exposes `canModerate` to reveal the Account moderation tab; every queue read and decision still checks server roles. Authors cannot moderate or vote on their own reviews. SQL triggers also enforce role, revision and vote eligibility; append-only decision records bind the moderator, review, reason, timestamp and request fingerprint. Stale or conflicting decisions return 409. Helpful totals and the viewer's current vote come from the database, not browser counters.

`production.ts` exports distinct identity, account-store and payment/ownership/game-delivery interfaces. Their default implementations throw `ProductionNotConfiguredError`. They are not wired to a public enabling route. The future provider name, credentials, payment processing, settlement permissions and game delivery must be supplied and independently validated before production use.

## Local wallet linking

This is authenticated account linking, not wallet login, token custody or asset import. The same loopback-only local API gate remains in force; hosted/production requests cannot enable it. Apply additive migration `0005_local_wallet_links.sql` to the local database before using these routes. No migration has been applied to a running or production database as part of the implementation.

The server creates an EIP-191 message in the ERC-4361 message shape, explicitly stating that the signature links a local account and does not authorize transactions or access to funds. It binds the exact address, chain 1, current domain and origin (including port), random 128-bit nonce, issue/expiry times, request ID and opaque local account ID. The stored challenge additionally binds the requesting session hash. Clients cannot supply or override the message, account, nonce, domain, expiry or network. The server checks expiry and signature against this exact message; successful linking consumes the nonce in the same transaction as insertion. Session validity and expiry are checked again at insertion. Unlinking does not make an old signature reusable.

Signature verification uses pinned `ethers` 6.17.0 [`verifyMessage`](https://docs.ethers.org/v6/api/hashing/#verifyMessage); address normalization uses its EIP-55-aware `getAddress`. The message fields follow the [ERC-4361 specification](https://eips.ethereum.org/EIPS/eip-4361). Only externally owned account signatures are supported. This is not a full production SIWE service: ERC-1271 contract-wallet validation, production identity integration and revocation policy remain unconfigured. No RPC/provider is created, and no transfer, spending approval or transaction request is made. Mainnet asset synchronization and game delivery are returned explicitly as `unconfigured`; wallet proof never creates inventory, enables an order or grants a verification badge.

Normalized addresses have a global unique database constraint, so competing accounts cannot link the same address. Account authentication, exact origin, CSRF and database rate limits apply to all wallet writes. GET only lists the authenticated account's links; DELETE checks that account's ownership. Only a signature hash is retained with the link, not the raw signature. Challenges retain consumed status for replay prevention. The account may unlink and authorize a fresh link later with a new signature.

## Profile photos and ZERO integration boundary

Local profile photos are stored separately by authenticated user ID in `store_profile_photos` (additive migration `0006`). Upload and removal require the normal session, exact origin and CSRF checks. The server accepts only canonical base64 JPEG data with a decoded size of at most 256 KiB; it checks JPEG magic, segment lengths, frame dimensions, quantization/Huffman tables, scan boundaries and final end marker. Dimensions must be at most 512×512. This is bounded structural validation, not a server image decoder or transformation. SVG, external image URLs, spoofed MIME prefixes, unsupported formats, truncated containers and trailing payloads are rejected. The browser profile editor decodes the chosen image and re-encodes a cropped JPEG before upload.

Only the photo PUT route has a 350 KiB JSON transport cap. All other writes retain their 16 KiB bound. Profile and session DTOs contain a same-origin, revisioned `avatarUrl`, never the large image payload. The image route always selects the authenticated user's row, sends `image/jpeg`, `nosniff`, `private, no-store` and same-origin resource policy, and is unavailable publicly. Replacing a photo overwrites only that account's row; deletion is idempotent. Public listing and review reads do not expose private profile photographs.

The intended shared profile source is ZERO, but its authenticated subject mapping, API/schema, media storage, revision rules and change propagation are not configured in this checkout. Local users are explicitly returned with `profileSource: 'local'` and `zeroSyncStatus: 'unconfigured'`; local edits do not write to ZERO. `ProductionAccountStore` now defines ZERO profile read, validated update (expected revision plus idempotency key) and synchronization status methods. Every default production method still throws `ProductionNotConfiguredError`. A future implementation must validate ZERO authentication, persist changes to the canonical ZERO account, report pending/failed synchronization honestly and propagate confirmed updates across its consumers. No URL or credential has been invented and no local ID is treated as a ZERO subject.
