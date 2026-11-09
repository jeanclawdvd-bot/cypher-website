# Local validation — 2026-11-06

## Upgradeable follow-up — 2026-11-07

The separate proxy implementations pass **27/27 tests**: the full 21-test identity/collection/production regression suite through atomically initialized proxies, plus six upgrade/security/storage tests. They verify initialization locks, separate governance authority, a local test timelock delay, upgrade-family rejection, ownership/approval and cap preservation, installed/equipped/placed locks, nonce/ownership versions, immutable recipe bindings and global replay state through upgrades. Evidence: `upgrade-regression-tests.log`.

The local upgradeable fixture also passed (`local-upgradeable-fixture.log`). It exercises five proxies, local test governance, rim installation, validated production and a Vehicles V2 upgrade. Reports and storage layouts are under workspace `outputs/ww-collections-upgradeable-20261107/`. The chain is in-process and discarded; no live authority or supply is assigned. Governance can replace logic, so caps are not promised immutable against malicious privileged upgrades. See `UPGRADEABLE.md`.

## Constructor baseline

- Compiler: solc-js `0.8.38+commit.1835d247`, optimizer 200 runs, Cancun target. All compiled runtimes are within the 24,576-byte EIP-170 size limit.
- Collections: **10/10 tests passed**.
- Production/global settlement: **10/10 tests passed**.
- Canonical identity encoding: **1/1 test passed**.
- Explicit local fixture: passed after final collection names were applied; three collections, five fictional products, rim installation and global settlement receipts. The in-process chain was discarded.
- Read-only peer review found a public job-ID reservation issue. It was fixed by owner/recipe/chain/adapter-bound derivation and a foreign-owner front-running regression test. Follow-up review found no additional concrete bypass in the reviewed paths.

The final combined run passed **21/21 tests**: 20 Solidity integration tests plus one identity test. This run includes the owner-bound job-ID fix, final collection names, ERC1271 attestor validation and mint-callback forwarding. Compilation regenerated the integration ABIs; no production contract source or identity encoding changed during the added-test pass.

Dedicated ERC1271 fixtures now verify valid ECDSA-backed contract authorization, wrong and malformed signatures, rejecting/reverting/malformed contract responses, unchanged nonces after failures, role revocation/regrant and owner-safe pickup after revocation. A receiver fixture forwards the freshly minted token during its callback: its original receipt recipient differs from final `ownerOf`, as permitted by ERC721. The same test verifies full rollback when that receiver rejects after forwarding. The fulfillment service's current-owner check, reviewed read-only, occurs before any game grant and also on later delivery reconciliation.

This is functional/adversarial local validation, not an independent security audit. External game/database persistence is not atomic with on-chain transitions; the integration must reconcile current ownership and canonical events as described in README.md.

No public chain, wallet funds, existing collectible, live asset registry or deployed storefront was modified by this package.
