# Frank Wilder totem intake

The current shop contains ten Frank Wilder pendant/totem designs, plus the two existing chain and pendant source candidates. Emperor Ring is excluded. Trinity has been removed from active browsing and item routes; its historical registry, original artwork and existing ownership restrictions remain unchanged. This change does not retire, replace or remint an existing collectible.

The ten new storefront IDs are `totem-fw-<Shopify handle>`. Their separate registry is `src/sites/wilderworld/marketplace/frank-wilder-totems.json`, mirrored at `outputs/ww-frank-wilder-totems-20261107/digital-intake-registry.json`. Each records the exact Shopify product and variant IDs, source URL, reference photograph and its SHA-256. The original physical catalog and reference manifest are retained as evidence. Physical prices, stock status, materials, chain options and purchase history are not imported as digital sale terms or entitlements.

| Storefront ID | Source product |
| --- | --- |
| totem-fw-hermes-ii | Hermes II |
| totem-fw-hercules-ii | Hercules II Totem |
| totem-fw-hercules | Hercules |
| totem-fw-deadusa | Deadusa |
| totem-fw-da-vinci | Da Vinci |
| totem-fw-emperor | Emperor |
| totem-fw-achilles | Achilles |
| totem-fw-queen-isis | Queen Isis |
| totem-fw-faceless-pharaoh | Faceless Pharaoh |
| totem-fw-fragment | Fragment |

## Presentation and collection mapping

Totems have their own web section and belong to the proposed **Wilder: Clothing** collection (`WilderClothing`). This names a proposed target, not an existing deployed address or permission to mint. Contract address, token ID, approved edition, supply cap, price, production recipe and mint permission are all null. No contract source was changed or deployed.

The updated request defines nine material studies per design: sterling, yellow gold, rose gold, black rhodium, platinum, titanium, copper, ceramic white and cobalt. Stable preview IDs are `MAT-totem-fw-<handle>-<material-id>`. The current art direction is a close-up of the **pendant alone on dark charcoal**, with no chain in the Frank Wilder product photographs. Only reviewed `v3-pendant` images marked `presentation: pendant_only` are exposed by `frank-wilder-totems.ts`. Historical v2 chained photographs and their references remain archived and cannot serve as fallback images.

There are currently 85 reviewed pendant-only finishes out of 90 planned. Queen Isis ceramic white, copper, platinum, rose gold and titanium remain withheld after image-generation moderation blocks. The original triangle pendant has nine pendant-only studies; the separate Chain / 02 product remains a chain. These are generated product-photo concepts, not proof of a native game asset, verified chain assembly, implemented material or approved edition. A future purchase is proposed to grant one selected approved finish. Item quantity, in-game chain inclusion and final contents remain undecided.

## Model intake

Every stage below is **pending**, with empty evidence and no automatic advancement from a product photo or physical purchase.

1. **Model upload:** receive the original digital model, file hash, provenance and submission record.
2. **Source binding:** after upload, verify the model against this exact design and record Unreal asset paths, mesh hash and material bindings.
3. **Compatibility validation:** after binding, validate avatar fits, equipment slot, chain assembly, clothing intersections and tested game build.
4. **Entitlement readiness:** after compatibility, approve the edition, mint permission, ownership checks and game delivery adapter. Source identification or a recipe proposal alone cannot approve this stage.

The registry records the pending stages. A local-only intake CLI now receives explicitly supplied files into a separate evidence folder. It does not update the registry, mark any stage approved or represent a hosted upload service. Real source models have not been received through this tool; tests use synthetic fixtures only. Evidence must be reviewed before a stage changes status.

Payment confirmation, mint settlement and delivery in game remain separate states. Payments and minting are disabled; game delivery awaits model integration. Physical ownership grants no automatic digital rights. Runtime fits, editions, prices, supply limits and gameplay effects are unresolved.

## Local model submission

Run these commands from `sites/wilder-fashion-review/checkout` using the project's Node version. No dependency installation is required for this tool.

```powershell
node scripts/intake-frank-wilder-model.mjs --list
node scripts/intake-frank-wilder-model.mjs --help
```

Create a UTF-8 provenance JSON file alongside the model. Copy the exact `productId` and `sourceProductId` from `--list`. For example, the Hermes II identity is:

```json
{
  "productId": "totem-fw-hermes-ii",
  "sourceProductId": "gid://shopify/Product/7909385404502",
  "submittedBy": "Name of the submitting person or team",
  "createdBy": "Name of the model author or source studio",
  "sourceReference": "Source delivery reference and model revision",
  "rightsStatement": "Describe the documented permission to use this digital model",
  "notes": "Optional export notes"
}
```

Replace the example paths with the actual model and provenance file paths:

```powershell
node scripts/intake-frank-wilder-model.mjs --product totem-fw-hermes-ii --model "C:\path\to\hermes-ii.glb" --provenance "C:\path\to\hermes-ii.provenance.json"
```

The CLI accepts only an exact known Frank Wilder product ID. The submitted physical-source ID must match it. Rights statements are submitted evidence, not verified rights. The tool never edits physical product IDs, their variant IDs, the historical catalog or Trinity ownership records.

Accepted formats and bounds:

- **GLB 2.0:** a self-contained core glTF model with embedded geometry and PNG/JPEG images. File/header/chunk lengths, JSON structure, buffer/view/accessor bounds and selected mesh/scene/texture references are checked. Resource URIs, including data URIs, are rejected. Extension declarations and nonempty extension blocks are rejected because their resource loading requires separate reviewed importers. Sparse accessors are unsupported in this preflight.
- **Binary FBX 7.x:** signature and version checks only. Received as unreviewed evidence; node structure, dependencies, textures and native importer safety remain unchecked. ASCII FBX is rejected. FBX header acceptance is not proof of a valid model.
- Maximum model size: **100 MiB**. Maximum provenance JSON: **32 KiB**. GLB JSON is limited to **4 MiB**, **32 nested levels** and **50,000 values**. Separate `.gltf` files and external resources must first be exported into an accepted self-contained GLB by the asset author.

Neither format receives full glTF/FBX semantic validation, visual approval, malware certification, avatar fit or runtime compatibility approval. The tool does not execute a model, fetch resources, upload files or launch/import into Unreal.

## Evidence and repeat submissions

The CLI writes only under this workspace's `outputs/ww-model-intake/<productId>/<sha256>/`:

- `model.glb` or `model.fbx`: an exact copy with a SHA-256 digest.
- `submission.json`: original file path/name, byte count, source identities, provenance, preflight scope, receipt time and all pending review gates.

Same-product, same-hash submissions with matching provenance return the existing receipt without overwriting it. Changed model bytes create a separate revision. The same hash cannot be registered against a second product. A provenance conflict, altered stored model or altered permission state is rejected for operator review. Existing receipts are never repaired or replaced automatically.

Absolute local paths are required. Traversal, network shares, alternate data streams, symlinks and junctions are rejected. Output stays beneath the workspace output directory. A local lock serializes submissions. If an interrupted run leaves `.intake.lock` or `.pending-*`, first confirm its process is no longer running and inspect the recorded evidence; automatic recovery deliberately does not delete or overwrite it. This is local developer tooling on an operator-controlled filesystem, not a hardened multi-user file-upload service.

Every receipt remains `received_unreviewed`. Source binding, rights review, native importer validation, fit, equipment slot, chain assembly, material bindings and tested game build remain pending. Edition, supply cap and token ID are null; purchase, minting, game entitlement and Unreal import flags remain false. A receipt is not a mint permit, settlement record or delivery event. Further reviewed integration must explicitly consume the evidence and complete the existing ordered gates.

## Validation

Focused tests cover exact source identity, stable storefront and preview IDs, nine-study planning and reviewed-image availability, ordered pending intake, null production fields, disabled fulfillment, accurate product detail copy and preserved Trinity history. Existing catalog, clothing reference-fidelity and product-readiness regressions are retained. This change adds ten design previews and removes one legacy storefront listing, a net increase of nine products. The Totems section contains twelve products, including the two retained chain bases.

Run the local intake tests with:

```powershell
node --test scripts/model-intake/core.test.mjs
```

The intake suite covers malformed GLB containers, embedded-resource limits, hostile extension URIs, JSON complexity, geometry references, unreviewed FBX receipts, physical identity mismatch, permission injection/tampering, duplicate hashes, revisions, immutable retry behavior, output boundaries, size limits, junction rejection and lock conflicts. The Windows validation run passed 52 tests with zero failures; one file-symlink fixture was skipped because the host disallows creating it. Actual source and output directory-junction rejection both passed. Fixtures are synthetic and removed from their checked temporary output directories after each test; no native catalog models or source registry values are changed.
