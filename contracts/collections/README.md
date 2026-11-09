# Wilder collections — local implementation for review

> **Superseded architecture:** this package preserves the older three-collection implementation. The latest target is **Vehicles, Clothing, Furniture, Statues, Totems**; rims remain in Vehicles. See [the current delta](../../docs/collection-contracts.md). Separate Statues/Totems implementations and validation are required before launch.

This package implements three new ERC721 collections, with supporting settlement infrastructure. It has **not been deployed to a public network or audited**. No existing collection, historical handoff, production price, cap, token identifier, contract address or wallet permission is adopted automatically. Local test fixtures are explicitly fictional.

The 2026-11-07 upgradeable implementation is in `src/upgradeable/`; see [UPGRADEABLE.md](UPGRADEABLE.md) for the UUPS architecture, governance trust, migration tests and local-only deployment instructions. Constructor-based contracts documented below remain the original regression baseline. Neither version is a live deployment.

| Collection | Permitted item kinds | Instance behavior |
| --- | --- | --- |
| `WilderVehicles` | Complete vehicle; complete `rim_set` | Same-owner, approved-pair rim installation; both tokens remain locked until removal |
| `WilderClothing` | Curated clothing; Totem | Game-attested equipment; owner can always unequip |
| `WilderFurniture` | Curated complete furniture object | Game-attested placement; owner can always pick up |

Totems are a web section in **WilderClothing**, not a fourth collection. Trinity remains an external existing-owned reference with `mintRoute: null`; nothing here reads legacy ownership as production permission or creates replacement Trinity tokens. The 163 curated clothing styles, 489 proposed colorways, 14 core rim patterns, 20 rim style/fitment groups and broader asset counts are catalog context, **not approved mint supplies**. Structural building modules, property ownership and business licenses are outside Furniture.

## Standard and identity decision

ERC721 is used because each purchased object needs its own persistent installation, placement or equipment state and an independently transferable owner. A complete rim set is one instance, not four separately minted wheel parts. ERC1155 would be suitable for interchangeable stacks, and is retained at the **component input interface**; splitting stack balances into stateful instances would otherwise complicate these behaviors. Resources use whole-unit ERC20 input interfaces. See the primary standards: [ERC721](https://eips.ethereum.org/EIPS/eip-721), [ERC1155](https://eips.ethereum.org/EIPS/eip-1155), and [OpenZeppelin ERC721](https://docs.openzeppelin.com/contracts/5.x/erc721).

Each product has an immutable `productId`, original source identity hash, item kind and explicit lifetime cap. Each approved edition binds exactly one product and one colorway, its own lifetime cap, and a nonempty metadata URI. Configuration cannot be overwritten. Product caps span all editions, so adding another color cannot bypass total supply. Token IDs are sequential per collection, beginning at one; token-to-edition identity never changes. Mint counters never decrease.

**One purchase unit mints one selected color edition**, not every proposed color. Quantity is represented by distinct authorized line-unit settlements. Other colors require separately approved purchases or production jobs. The on-chain URI string is immutable; metadata content must be put on content-addressed storage before real configuration if content immutability is required. This package does not upload metadata.

## Settlement and roles

Deploy one `SettlementRegistry`, then pass its address into all three collection constructors `(admin, registry)`. Grant its `COLLECTION_ROLE` only to these verified collection deployments. A settlement is consumed globally across every collection and both routes. The collection's `usedSettlements` is a convenient local view; registry `consumedBy` is the global source of truth. A failed transaction restores both.

- `CONFIG_ROLE` can approve new immutable products, editions, fitment pairs and production recipes. It cannot edit existing caps or metadata. Constructor admin initially has this role.
- `FULFILLER_ROLE` can call `settlePurchase(settlementId, editionId, recipient)`. **No role is granted by default.** It must belong to the approved fulfillment service/router, which verifies payment and purchase authorization outside this package.
- `PRODUCTION_ROLE` can call `settleProduction` with the same parameters. Grant it only to a reviewed `ProductionSettlement` deployment. The interface/code check prevents obvious wiring mistakes; it cannot prove an arbitrary contract honest. Governance remains trusted to grant the correct implementation.
- `GAME_ATTESTOR_ROLE` verifies location/character eligibility. It is not a mint role. It is initially unassigned.
- `SETTLER_ROLE` on the production adapter attests completed game production, not a charge or arbitrary burn permission. It is initially unassigned.
- `DEFAULT_ADMIN_ROLE` manages roles. Before a live deployment, choose and review multisig/timelock custody, recovery and operational separation; this local package does not select those policies.

Settlement IDs must be derived from the canonical merchant order **line unit** or production job and a stable environment/merchant namespace. Do not include collection, recipient, color or route in a way that allows the same business event to receive a new ID. The chain rejects repeated IDs, but cannot recognize a backend that intentionally renames the same order. No external `mint`, `burn`, mutable URI, admin transfer or public recycling route exists. The transfer hook also prevents future inherited burn logic from bypassing active-use locks.

## Installation, equipment and placement

`installRims(vehicleTokenId, rimSetTokenId)` requires the caller to own both tokens, their kinds to match and their product pair to be explicitly approved. Operators cannot install on someone else's behalf. Both attachment mappings are updated together, with no external callback. Existing attachments cannot be silently replaced. Transfers, including operator/safe transfers, are blocked for both tokens. `uninstallRims(vehicleTokenId)` is owner-only and does not depend on an attestor or continued administrator availability.

`place` / `equip` take an EIP-712 `UsePermit`, attestor address and signature. The permit binds owner, token ID, eligible location/character context, eligibility evidence hash, per-owner nonce, current ownership version and deadline. Domain name is the collection name, version `1`, chain ID and verifying contract. Approved EOA and ERC1271 contract signers are supported. A permit cannot move across owners, collections, chains or ownership epochs. `invalidateUsePermits(newNonce)` cancels outstanding owner permits. The game attestor must actually check access/slot rules; a nonzero hash is evidence identity, not a proof of those off-chain rules.

Placed/equipped tokens cannot transfer. `pickup` / `unequip` requires only the current token owner and remains possible after attestor revocation. Placement does not mint land, grant access to someone else's space or change the game world by itself; game services consume the events. Multiplayer slot occupancy and property entitlement semantics remain the attestor's responsibility.

The on-chain lock is not atomic persistence in an external game database. A canonical-chain indexer and game reconciliation worker must process `UsageStarted`, `UsageEnded`, `RimsInstalled`, `RimsRemoved` and ERC721 `Transfer` events, handle finality/reorgs, recheck current ownership, and revoke or update the prior owner's game grant. A release followed immediately by transfer must not leave the old player's furniture/equipment entitlement active. Game mutation/grant operations must be idempotent and revocable; a historical purchase receipt alone is insufficient.

An ERC721 receiver can legitimately forward an unlocked token during its mint callback. The resulting `SettlementMinted.recipient` records the original delivery target, while `ownerOf(tokenId)` can already be someone else by the end of the same transaction. The fulfillment service must check current ownership before granting game access and again during reconciliation; it must not treat the mint recipient as proof of present ownership. The callback-forwarding test verifies this allowed transfer and verifies that a subsequent receiver rejection rolls back both the mint and the nested transfer.

## Production authorization and atomicity

`ProductionSettlement` is a settlement adapter, not a fabricated live factory. Its constructor pins **separate** `IBlueprintApproval` and `IEditionRights` contracts. Neither is implemented as a permissive production default. The only supplied concrete verifiers and resource/component issuers are conspicuously named test mocks.

1. An administrator registers trusted whole-unit resource/ERC1155 component input contracts. Inputs must be positive, unique by token/id, bounded to 16 entries and use the appropriate registered kind. Resource IDs must be zero and ERC20 decimals zero.
2. An immutable recipe specifies exact collection, edition and inputs. Its hash is `keccak256(abi.encode(collection, editionId, inputs))`. The external blueprint registry must approve that exact hash both at configuration and settlement. A new hash/version requires a new recipe ID.
3. The input owner calls `authorizeJob(jobSalt, recipeId, deadline)`, which returns the derived job ID. `jobIdFor(owner, recipeId, jobSalt)` hashes `abi.encode(JOB_DOMAIN, block.chainid, address(adapter), owner, recipeId, jobSalt)`, where `JOB_DOMAIN = keccak256("WILDER_PRODUCTION_JOB_V1")`. An observed salt cannot reserve another owner's job: owner, exact recipe, chain and adapter are bound. Salt must be nonzero. General token approvals alone do not authorize a job. Cancellation is owner-only and terminal; cancelled/completed IDs cannot be reused.
4. An authorized game settler calls `settle(jobId)` after real production completion. The adapter consumes **one separately validated right** scoped to owner, collection, edition and recipe hash. Recipe approval, legacy collectibles and equipment ownership do not substitute for that right.
5. It burns the exact approved inputs via ERC20 `burnFrom` / ERC1155 `burn`, then calls the target collection's production settlement. Output is always one token to the input owner; the caller cannot substitute another recipient, edition or collection.

Rights consumption, resource and component burns, job/replay state and safe output mint occur in **one transaction**. A missing allowance, right, input, revoked blueprint, sold-out edition, global replay or rejecting receiver rolls everything back. Production and collection receiver entry points have reentrancy guards and update state before callbacks.

Recipe review must ensure components are consumed as complete assemblies without charging their embedded raw resources again, validate any upstream recipe graph, and authorize the output spec. Those semantic checks belong to the approved blueprint registry; this adapter validates a bounded, exact flat settlement list. It does not invent live fees, production durations, facility permissions, recycling yields or legacy license terms from mock CSV values. Tokens and verifier implementations on the allowlist are trusted dependencies; interface compliance alone cannot establish correct business policy.

## Fulfillment identity mapping

`SettlementMinted` supplies settlement ID, token ID, edition ID, recipient and production flag. A server receipt verifier must check the expected chain/collection, canonical finalized transaction/log, then resolve `tokenProduct(tokenId)` (the fulfillment `productKey`) and `editions(editionId).colorwayId` (the fulfillment `variantId`). The catalog's source-facing `productId` and `conceptId` are registry strings, not ERC721 token IDs. Resolve the approved exact mapping server-side; do not accept browser-supplied identity or infer all colors from one token. `types.ts` includes this verifier projection and an external-only Trinity reference.

For eventual configuration, `scripts/identity.mjs` defines stable domain-separated registry keys: `keccak256(abi.encode("wilder:<domain>:v1", exactRegistryString))`, with domains `product`, `edition`, `colorway` and `purchase-settlement`. Preserve exact case, spelling and NFC form; surrounding whitespace/noncanonical input is rejected, not silently changed. ABI encoding avoids ambiguous concatenation. Store the approved string-to-bytes32 mapping and never hash an already resolved bytes32 a second time. This utility does not approve any existing registry entry.

`sourceIdentityHash(sourceIds, sourceAssets)` hashes `abi.encode("wilder:source-identity:v1", sortedUniqueSourceIds, sortedUniqueSourceAssetPaths)`. Both sets preserve exact case and path text, use deterministic string sort and reject duplicates. It identifies the source provenance set, not the contents of a source file; separate asset/header SHA256 evidence remains in the registry. Production job IDs use the owner-bound on-chain derivation above, distinct from merchant purchase IDs, while both are consumed by the same global settlement registry.

## Reproduce locally

Requirements: Node 22.13+ and npm. Dependencies are exact pinned and the lockfile is committed: Hardhat 3.21.2, OpenZeppelin Contracts 5.6.1, ethers 6.17.0, solc-js 0.8.38. Standards/tooling were verified against official primary documentation and the official npm registry on 2026-11-06. [Hardhat Node requirements](https://hardhat.org/docs/getting-started), [Hardhat simulated network API](https://hardhat.org/docs/reference/network-manager), [OpenZeppelin access control](https://docs.openzeppelin.com/contracts/5.x/access-control), [OpenZeppelin release notes](https://docs.openzeppelin.com/contracts/5.x/changelog).

From this directory:

```text
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run compile
npm test
npm run local:fixture
```

If npm is absent from PATH in this handoff environment, invoke the existing npm CLI with Node: `node ../../outputs/npm-tool/package/bin/npm-cli.js <arguments>`.

Compilation uses the pinned local solc-js package with optimization (200 runs) and Cancun EVM target, not a remote compiler download. It rejects contracts exceeding the EIP-170 runtime size limit. Confirm the eventual target chain supports Cancun before choosing any public network.

Tests and `local:fixture` create isolated in-process Hardhat EDR chains with chain ID 31337. No RPC URL, real wallet or live deployment address is read. The fixture script configures five fictional `LOCAL_*` products with explicit two-unit test caps, issues example objects and installs a test rim set. It writes ignored `local-fixture.json`, then discards the chain. Those deterministic addresses are not live contracts. There is deliberately no public-network deployment script.

`abi/` contains integration ABIs; `types.ts` contains matching identity/permit/input types. `artifacts/` contains generated bytecode and is ignored. The fixture mocks under `test/mocks` must never be registered as production verifiers or tokens.

## Validation scope and remaining decisions

The executable tests cover supply/role/configuration boundaries; shared replay across collections and routes; safe receiver reentrancy, forwarding and rejection; approved same-owner rim attachment and locked operator/safe transfers; attested eligibility, ownership epochs, nonces and expiration; ERC1271 valid/wrong/malformed signatures, rejecting/reverting/malformed contract responses and role revocation; owner-safe release; independent edition rights; immutable approved inputs; owner job authorization and foreign-owner front-running; production cancellation/revocation; canonical identity encoding; and rollback of all inputs/rights when output delivery fails.

Before live deployment: choose chain/custody, approve the actual product+edition registry and explicit caps, publish content-addressed metadata, implement/review real blueprint and edition-right verifiers, define facility/time/payment authorization, identify existing legacy contracts and rules, review complete furniture eligibility, and complete independent contract/security review. The supplied handoff files remain historical proposals. No payment provider, storefront fulfillment service, live contract or existing asset has been altered by this package.
