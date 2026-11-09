# Wilder World storefront — Dom handoff

Current shopping experience, product media, local account/market backend, and contract reference package. This branch imports published preview **v27** (`f09dac634227f4711c64d571bc29c2ab1b21294c`) onto the existing Cypher repository. It is a review branch, not a production commerce release.

- **Start here:** [Dom's brief](docs/dom-handoff.md).
- **Preview:** https://wilder-world-fashion-review-20261106.frankwilder.chatgpt.site/
- **Lifestyle approval gallery:** https://wilder-world-fashion-review-20261106.frankwilder.chatgpt.site/lifestyle-review/
- **Latest architecture:** [five collection contracts](docs/collection-contracts.md).
- **Checks and gaps:** [validation](handoff/VALIDATION.md).

## Run locally

Use **Node 22.13+** and **pnpm 11.25.0**. This version uses React 19 and Next-compatible routes through **Vinext/Vite and a Cloudflare Worker**. Use this flow rather than `next start`. The independent Solidity package has its own npm lockfile.

```sh
pnpm install --frozen-lockfile
pnpm build
node scripts/prepare-local-store.mjs
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 migrations apply STORE_DB --config .tmp/local-store/wrangler.json --local --persist-to .wrangler/state
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js dev --config .tmp/local-store/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 8791 --inspector-port 0
```

Open http://127.0.0.1:8791/. All product media is included under `public/`; local running does not need R2 credentials. Back up existing `.wrangler/state` before migrations. Account tables use the six migrations in `migrations/store`.

At `/store/account`, register a **test-only account**, then use **Add test items**. Use a second test account for buying. Local payment and ownership fixtures do not move money or mint assets. Public preview does not enable local registration. Production ZERO integration remains outstanding.

For frontend iteration: `pnpm dev`. For local account testing use the built Worker above. Optional provider keys go in `.env.local` using `.env.example`; never commit real credentials. Review mode works without them, with missing-data states.

```sh
pnpm typecheck
pnpm exec vitest run --no-file-parallelism
```

Bundled approval fixtures live in `handoff/fixtures`; audit output goes to ignored `.tmp/handoff`. These checks need no original workspace folders. Historical creative/export scripts can still reference external Unreal/workspace evidence; they are not prerequisites for running the app.

## Source map

| Area | Location |
| --- | --- |
| Routes, account and originals | `src/app/store` |
| Catalog, materials, editions, media approvals | `src/sites/wilderworld/marketplace` |
| Clothing product pages | `src/sites/wilderworld/accessories` |
| Registry and fulfillment interfaces | `src/sites/wilderworld/collections` |
| Local backend and production adapters | `src/lib/store-backend`, `worker`, `migrations/store` |
| Catalog / five-contract target | `handoff/catalog`, `handoff/Collection-Product-Registry.target.json` |
| Older three-contract source/tests | `contracts/collections` |

Frank continues creative and product refinement. **Product photos are unchanged. Product-page lifestyle images remain withheld** until individually approved in `lifestyle-approvals.json`.

Hosting configuration references the existing review project. Select the intended environment before deploying or merging into an auto-deploy branch. No production accounts, private keys, account databases or deployment credentials are included. Other brand sites remain in the repository; this handoff is scoped to the Wilder World storefront.
