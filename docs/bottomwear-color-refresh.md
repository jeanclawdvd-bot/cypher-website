# Late Checkout and Floor Memory color refresh

The requested refresh covers Late Checkout (`BTWR_007`) and the eight Floor Memory styles (`BTWR_010`, `BTWR_010_A` through `_G`). Each keeps its own silhouette, original product ID, source SKU and nine concept IDs. Original photographs remain unchanged in the source catalog and `sourceVariants`; new photography changes only the displayed color treatment.

The nine combinations balance pale neutrals and stronger colors: Porcelain / Navy, Cobalt / Graphite, Apricot / Bone, Lagoon / Ink, Aluminum / Carbon, Racing Red / Black, Lilac / Cloud, Citron / Ink and Sand / Espresso. Each style has a different lead color. Existing armor, belts, buckles, seams, quilted panels and individual style configurations are preserved in the reference edits.

The full prompt set and proposed palette are in `outputs/ww-reference-fidelity-20261107/generation-bottom-palettes/jobs.json` and `palette-plan.json`. Every image uses the built-in image generator with an inspected approved product photograph, then receives visual comparison and transparency checks. The per-image JSON records the original reference, generated master, review and provenance. These are image concepts; they do not establish native geometry equivalence or implemented game materials.

The first three display colors use `bottomwear-presentation-overrides.json`, guarded against missing review or a mismatched original reference. The six remaining colors use the shared fashion material-image registry. Both preserve existing identifiers. A product switches its lead photo only after all nine images pass review and the matching six material records are integrated. Unreviewed photos cannot replace the originals.

The product page and preview bag resolve the same selected photo and color name. Source material descriptions are not reused for newly recolored display images. Numeric shader values and game material bindings remain unverified; no source assets, onchain mappings, prices, compatibility records or ownership rights change.
