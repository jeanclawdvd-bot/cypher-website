# Collection contracts — latest direction, 9 November 2026 UTC

Frank's latest instruction is **five collection contracts**: Vehicles, Clothing, Furniture, Statues and Totems. This replaces the earlier three-family design. It is an architecture decision, not deployment or mint authorization.

| Target | Allowed products | Instance behavior |
| --- | --- | --- |
| `WilderVehicles` | `vehicle`, `rim_set` | Approved fitment, same-owner installation; installed rim set and host locked against independent transfer until removal |
| `WilderClothing` | Apparel and wearable accessories | Exact fit/finish identity, game-attested equipment, owner-controlled unequip |
| `WilderFurniture` | Complete furniture objects | Game-attested placement, owner-controlled pickup before transfer |
| `WilderStatues` | Complete sculptures | Same placement/ownership guarantees, separate collection identity |
| `WilderTotems` | New FW totems | Approved game-model binding and equipment rules; existing Trinity tokens excluded from new issuance |

Rims have a separate web section but **remain in Vehicles**. Glasses, hats, helmets and headphones remain Clothing. Existing Genesis/Packs collections are not migrated or reminted.

## Implementation delta

`contracts/collections` preserves the earlier, locally tested **three-collection baseline**, including constructor and UUPS versions. `src/sites/wilderworld/collections/registry.json` is historical evidence. Runtime `source-token-audit.ts` also still produces the older grouping. Neither implements the new target.

`handoff/Collection-Product-Registry.target.json` maps all 221 retained products and 1,989 concepts to five targets, preserving previous families, source IDs, provenance, null addresses/token IDs/caps, and disabled mint permissions. It is a proposal, not executable launch configuration. Historical approval fixtures remain unchanged.

Before configuring real products:

1. Add Statues and Totems implementations and independent proxy/collection identities. Restrict each collection to its allowed item kinds. Do not renumber existing enum values; version any new kind explicitly. Test rejection of wrong kinds.
2. Share settlement replay protection, role checks, edition/supply validation and production adapters across **all five**. Reuse attested usage for equipment and placement. Update ABI exports, identity types, fixtures, fulfillment allowlists, game adapters and runtime registry/audit generation.
3. Keep one token per issued instance. **ERC721 remains the baseline** for individual usage, installation and transfer state. Edition quantities are caps over instances, not one token ID for all copies. Existing ERC1155 Packs and Resources/Components interfaces retain their real standards.
4. Preserve source SKU → style/fit → concept → approved edition → chain/collection/token mapping. UI grouping grants no cross-fit or all-colors entitlement. Leave unapproved game materials, caps, prices, placement and rim contents/fitment unresolved.
5. Extend replay, cap, wrong-family mint, role, callback reentrancy, usage/transfer lock, removal, production-input rollback and UUPS upgrade/state tests across all five. Independently review governance/security before public deployment.

Only authorized fulfillment or validated production may mint. Recipe proposals do not grant legacy edition rights. Define actual front/rear contents for each rim set before approval. Property titles, building modules, business rights and automatic performance upgrades remain outside scope.

Chain, governance authorities/delay, addresses, edition permissions, royalties, final caps and metadata URIs remain unresolved. No contracts were changed or deployed in this Git handoff.
