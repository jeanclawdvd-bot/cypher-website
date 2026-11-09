# Handoff validation — 9 November 2026 UTC

This is an engineering review handoff, **not full frontend or production signoff**.

| Check | Result |
| --- | --- |
| Production bundle (`node scripts/run-framework.mjs build`) | Passed |
| TypeScript (`tsc --noEmit`) | Passed |
| Local Worker/database bootstrap | All six D1 migrations passed in an isolated database |
| HTTP smoke | Homepage, browse, selected eyewear, Totems, account and lifestyle review returned 200 |
| Full Vitest suite | **635 passed, 19 failed; 94 files (78 passed, 16 failed)** |
| Imported public media | **7,201 files identical** to published v27; product photos unchanged |
| Credentials / file limits | No matches for common private-key/API-token patterns; no file >=100 MiB |
| New contract mapping | 221 unique products, 1,989 concepts; five target collections; all issuance disabled |

The first attempts hit Windows cache permissions and local disk exhaustion; only the completed retry is counted above. Dependencies were reused from the existing locked local install; a clean network install on Dom's machine was not performed. Local HTTP checks do not substitute for real-device interaction testing. The six-route smoke check did not exercise production providers or payments.

See `evidence/frontend-tests.log`, `Test-Failures.json`, and `evidence/http-smoke.json`. The full suite must be reconciled before frontend acceptance. Do not simply delete assertions or restore excluded products to make it pass.

## Regression work

- Historical catalog counts expect 222/226 instead of 221; original collections now include Lamborghini (16 rather than 15). Object scene counts and removals also changed.
- Several tests expect old button labels, one-line accessible headings, image directory names or gallery sizes. Lifestyle galleries are intentionally held; source archives remain available.
- One navigation mock lacks `useRouter`; a wallet-link/provider-change test fails and needs investigation rather than assuming it is cosmetic.
- Currency/demo disclosures must remain honest and accessible even as UI text has been simplified. Reconcile the failing currency/market tests with that requirement.

The latest lifestyle approval and navigation/back-transition checks are included in this full run. Contracts were **not rerun or changed** for this handoff; earlier local three-family results are not validation of the new five-contract target.

## Production gates

ZERO identity/profile sync, self-custody ownership indexing, real listings/order execution, USD payments, reliable WILD quotes, moderation, settlement/game delivery, production infrastructure and independent security review remain outstanding. Sample charts/reviews and local inventory must not become real activity by changing labels.

Final game compatibility, native totem models, fitment, edition caps/prices, metadata and release permissions still require approval. The five-family target registry contains no addresses, assigned token IDs or approved mint rights. See `docs/collection-contracts.md` for the required migration from the bundled older baseline.
