# Local Wilder World accounts

The store now has a persistent local account service, separate from production
identity, token ownership, payments and game entitlement delivery. Its database
contains test accounts and test inventory only. It does not consume any proposed
edition supply or create rights in existing collections.

## Included flow

- Register, sign in, sign out and edit a display name/bio.
- Create one set of test inventory per account, using current product/variant IDs.
- View inventory, active/cancelled/sold listings, purchases, sales and own reviews.
- List an owned, unlocked test item; cancel a listing; simulate a purchase from
  another local account. New asks use exact WILD atomic strings; simulated buyers choose USD or WILD through an expiring server quote. Historical USD records retain their original terms. No balances or payment instrument are created.
- Persist pending reviews to the account. Only moderated, published records can
  contribute to ratings. Local records never receive production purchase or
  ownership verification badges.
- A separately granted local moderator can publish or reject reviews from Account → Moderation, with a required reason, revision check and immutable audit history. Authors cannot approve their own submissions.
- Signed-in readers can mark published reviews helpful and undo their vote. One vote per account; authors cannot vote on their own review.

The account page is `/store/account`; product pages show local listings for the
selected finish. The real-market panel stays separate and unavailable until its
verified market adapter is connected. Its sample chart is explicitly illustrative.

New local listings use **WILD only** with the approved **1% seller marketplace fee** and no buyer marketplace surcharge. Buyers can simulate paying in USD or WILD. The server issues an immutable five-minute quote before confirmation; the recorded payment and seller proceeds are separate currency amounts. The current conversion is an explicitly labelled fictional fixture: **1 WILD = $0.10**, never a live exchange rate. USD payments round upward to a cent, shown in the confirmation. A 100 WILD listing records a 1 WILD fee and 99 WILD proceeds. No money moves.

Migration `0004_local_wild_currency.sql` preserves all historical USD listings/sales, their zero-fee or 1% terms, IDs, dates and review links. New WILD rows have exact string amounts and null legacy cents fields. Historical USD listings may still settle under their stored terms. For a fresh checkout or older database, back up the local state and apply all migrations through the local command below before starting the updated build. The November 8 local browser walkthrough verified the WILD listing, currency quote and simulated transfer flow on port 8791.

## Run locally

From this checkout, build and prepare a separate local configuration:

```powershell
node scripts/run-framework.mjs build
node scripts/prepare-local-store.mjs
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 migrations apply STORE_DB --config .tmp/local-store/wrangler.json --local --persist-to .wrangler/state
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js dev --config .tmp/local-store/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 8791 --inspector-port 0
```

Open `http://127.0.0.1:8791/store/account`. Create a local test account and use
**Add test items** to exercise inventory/listing flows. A second account can buy
those test listings. The database persists under `.wrangler/state`; rebuilding
the site does not erase it. The preparation script never changes the production
hosting configuration and does not create a remote database.

The API prefix is `/api/store/v1`. It requires `STORE_MODE=local`, a loopback
hostname and the dedicated `STORE_DB` binding. Other hosts/modes fail closed.
The worker intercepts this prefix before the page framework. A built site without
the generated local configuration has no enabled account service.

## Security and state

Passwords are salted scrypt hashes; session cookies are opaque, HttpOnly,
SameSite=Strict and expire after 24 hours. The database stores token hashes.
Authenticated mutations require the session-bound CSRF token and exact Origin;
registration/login also require same-origin JSON requests. Profile fields are
allowlisted. User identity comes from the session, never a client-supplied owner.

SQLite constraints and triggers enforce one active listing per item and ownership
and usage checks. A sale inserts its record, closes the listing and moves the
test item atomically. Scoped idempotency keys bind to the exact purchase request.
Installed, placed or equipped test items cannot be listed or sold independently.
Session revocation, malformed input and auth/write rate limits are enforced server
side. Client rendering does not grant authority.

## Validation

The new currency migration is covered by real SQLite integration tests: uint256-sized amounts, exact fee conservation, historical USD preservation and review foreign keys, mandatory WILD listing currency, immutable buyer-bound quotes, forged quote/rate/payment rejection, expiry at the HTTP and database boundaries, replay after expiry, competing buyers and currency-specific payment rounding. Client checks cover WILD listing input, currency selection, confirmation, stale quotes and retry keys. The separate loopback HTTP checker has been updated to the new quote API; run it only after migrating and restarting the local build.

On 2026-11-08, the combined fee, backend, account and product-market suites passed
59 tests across seven files. The search dropdown and affected navigation suites
also passed 22 tests. TypeScript and the local production build passed. After a
backup of the local D1 state, migration `0003_local_marketplace_fees.sql` was
applied locally and the preview was restarted on port 8791. The real local HTTP
lifecycle checker passed all nine grouped checks, including fee snapshot values,
competing purchasers, replay, ownership and cancellation. Browser verification
confirmed a $21.98 sample sale displays a $0.22 seller fee and $21.76 proceeds;
the new search dropdown preserves its category and query on submission.
These checks do not validate production settlement or pack opening.

On 2026-11-07, 24 backend tests passed across the HTTP/SQLite integration,
credential and request-body suites. These execute the real SQL migration and
triggers through an in-memory D1 transport adapter. The separate Wrangler/D1
HTTP lifecycle check also passed all nine grouped checks on port 8792:
registration/session flags, profile/CSRF isolation, one-time grants, ownership
and usage locks, competing buyers, exact/mismatched retries and stale prices,
cancellation, pending reviews and logout/password authentication.

The live check exposed and resolved a rejected-request stream issue: a
cross-origin rejection could disrupt the next local mutation. Rejected requests
now finish reading bounded input before returning; oversized bodies are cancelled.
The final HTTP run verified rejection followed by successful legitimate calls.

```powershell
node node_modules/vitest/vitest.mjs run src/lib/store-backend/integration.test.ts src/lib/store-backend/crypto.test.ts src/lib/store-backend/http-body.test.ts
node tools/test-store-backend.cjs http://127.0.0.1:8791
```

The HTTP command creates isolated `example.test` accounts and local test copies.
It never contacts a public host, pays, mints or delivers a game entitlement. Passing
runs leave their test listings sold or cancelled. Logs are
`.tmp/collection-tests/local-store-security-integration.log` and
`.tmp/collection-tests/local-store-http-lifecycle.log`. Desktop/mobile visual QA
is a separate check.

## Production boundary

ZERO is the intended production account/profile source; its service is not configured.
Do not infer its endpoints or trust incoming identity headers. Before connecting
it, confirm its identity verification protocol, subject mapping, schema
and database transaction guarantees. The production adapter fails closed.

Production inventory must be derived from validated chain/fulfillment evidence;
the one-time local seed route is never part of production. Keep payment
confirmation, mint/transfer settlement and game entitlement delivery as separate
retry-safe states. Connect the existing Resources, Components and Blueprint
edition permissions separately. A local sale is neither payment proof nor a
game-ready entitlement.

## Local review moderation setup

Apply the normal local migrations command above; it now includes `0002_local_reviews.sql`. Register a separate test moderator account, then grant its role through the local operator command (replace the example email with that test account):

```powershell
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute STORE_DB --config .tmp/local-store/wrangler.json --local --persist-to .wrangler/state --command "INSERT OR IGNORE INTO store_moderators(user_id,granted_at) SELECT id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM store_users WHERE email='reviewer@example.test'"
```

Refresh the account page to see Moderation. Registration, profiles and browser requests cannot grant this role. Decisions require another account for the author's own reviews. Audit records live in `store_review_decisions`; `store_review_votes` enforces unique reader votes. The production review adapter remains unconfigured and throws rather than accepting local roles or purchase records as evidence.

Remaining production work includes provider SSO/session revocation, ownership
indexing, wallet/order signing, payment/settlement integration, production review
moderation and helpful-vote adapters, backups/retention/monitoring, and independent security review.
Local email credentials are a development mechanism, not a migration of real
user accounts. No production contracts, payments or public publishing are
performed by this implementation.

Local database behavior follows the existing Cloudflare runtime and its
[D1 local development model](https://developers.cloudflare.com/d1/best-practices/local-development/).
