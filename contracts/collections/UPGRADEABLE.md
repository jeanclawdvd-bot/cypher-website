# Upgradeable collections — local implementation

The recorded all-new-contract requirement is implemented for this package in `src/upgradeable/`: Vehicles, Clothing, Furniture, the global settlement registry and validated production adapter. Each uses an ERC1967 proxy and UUPS implementation. Constructor contracts remain regression baselines; this is not an in-place migration of an existing deployed contract. Totems remain in Clothing, and rims remain in Vehicles.

OpenZeppelin Contracts and Contracts Upgradeable are pinned to 5.6.1. Proxy deployment supplies initialization calldata atomically. Implementation constructors disable initializers. ERC721, access control and EIP712 use upgradeable library implementations. The storage-based reentrancy guard in Contracts 5.6.1 is marked stateless by the library; receiver reentrancy is exercised in the proxy regression suite. No transient-storage support is assumed.

## Upgrade authority and supply trust

`UPGRADE_ROLE` is separate from operational, fulfillment, configuration, production and game-attestor roles. It administers itself: an operational default admin cannot grant itself upgrade rights. Initialization requires a distinct governance contract, and later role grants also require a contract; delegation to an EOA is rejected. Code presence is only a mechanical check; real governance must be reviewed. Local tests use a TimelockController with a fictional one-hour delay. Production multisig members, timelock topology and delay remain unassigned. The local test timelock is not proposed as the production deployment.

Each implementation reports an upgrade family. Cross-family and non-UUPS upgrades are rejected. This prevents accidental mismatches; it does not prove behavioral or storage safety.

Current code keeps product/edition caps and identifiers write-once, retains lifetime minted counters and globally consumed settlements, and prevents additional color editions bypassing product supply caps. Tests upgrade every family and check ownership/approvals, caps, identity, replay, fitment, usage locks, permit nonces, recipes and production jobs.

**Limits are not cryptographically immutable against arbitrary privileged upgrades.** Every stateful service is upgradeable, so governance must approve only reviewed upgrades preserving these limits. A malicious authorized implementation can bypass code invariants. There is no claim of an immutable external supply guard; that would conflict with the recorded all-new-state-contract upgradeability direction. Governance acceptance and independent security review remain launch gates.

## Local validation and deployment

From this directory, after installing pinned dependencies:

```powershell
node scripts/compile.mjs
$env:WW_UPGRADEABLE_FIXTURE = '1'
node --test --test-concurrency=1 test/collections.test.mjs test/production.test.mjs test/identity.test.mjs test/upgrades.test.mjs
Remove-Item Env:WW_UPGRADEABLE_FIXTURE
node scripts/local-upgradeable-fixture.mjs
```

The fixture accepts no RPC URL/private key, creates only an in-process chain 31337, and discards it at exit. Its report and compiler layouts go to `outputs/ww-collections-upgradeable-20261107/`. Example caps/addresses must not enter a production registry.

Reviewed initialization order: registry implementation and atomically initialized proxy → three collection implementations and initialized proxies → registry collection permissions → validated production implementation/proxy → reviewed input/recipe/edition permissions. Fulfillment and game-attestor roles start unassigned. This package performs no frontend deployment or live mint.

## Storage and upgrade review

Preserve custom storage order/types; consume each inheritance layer's reserved gap when adding fields there. Do not insert state-bearing bases, reorder storage, alter existing structs, reset counters/replay maps, mutate sold edition identity, or reinitialize EIP712 domains. Library major-version changes are not automatically compatible. Compiler layouts are exported and the V1/V2 fixture layouts are compared structurally. A no-op V2 is evidence for this migration path, not certification of a future upgrade. Each real candidate needs storage validation, initializer/reinitializer review, stateful simulation and independent audit.

Primary references: [OpenZeppelin upgradeable contracts](https://docs.openzeppelin.com/contracts/5.x/upgradeable), [initializer and storage guidance](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable), [UUPS and proxy APIs](https://docs.openzeppelin.com/contracts/5.x/api/proxy).
