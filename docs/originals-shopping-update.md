# Wilder World shopping and original collections update

Date: 2026-11-07. Active checkout: sites/wilder-fashion-review/checkout.
Local preview: http://127.0.0.1:8791/ (also /store).
This update is local-only. No public publishing, contract deployment, signatures, payments, token transfers, minting or game delivery were performed.

## Shopping experience

The Wilder World root page now opens the shopping homepage. A single Wilder World shopping header combines product search, account access, department navigation and Play Now. The old marketing navigation is removed from the shopping shell. Discover links and the Wilder World footer preserve access to the wider site. Other company sites retain their own navigation and landing pages.

The shared shopping header now also lists all 15 original collections directly beneath the main departments, using canonical registry names and `/store/market?c=<slug>` links. It highlights and reveals the selected collection on both browse and token pages. The collection bar stays on one row at every screen size, with horizontal dragging, native touch/trackpad scrolling, keyboard access and left/right buttons when it overflows. These links do not prefetch all collection inventories. The existing search keeps its selected collection scope.

Original collections now use a dedicated store browse view at /store/market, with collection selection, product cards, search, trait filters and pagination. The default shows all collectible inventory rather than requiring active listings. Each original opens a full product page at /store/market/[slug]/[tokenId], using the same shopping header, typography and product-page structure as the new collections. Existing /market entry points and token links remain supported through redirects.

Original product pages keep NFT-specific information: exact chain, contract and token identity, original artwork/motion, traits, token standard, observed unique-token owner, provenance and external source links. Original collection photography is not passed off as a specific token's artwork. Invalid chain/contract substitutions in deep links are rejected.

## Data recovery and evidence

The accessible GitHub source is https://github.com/jeanclawdvd-bot/cypher-website, default branch master. Its registry matches the local eleven Ethereum and four Z-Chain collection bindings. Both the local configuration and the old public Vercel deployment lacked working OpenSea/private-indexer enrichment; the original Vercel NFT route returned HTTP 502 and direct OpenSea access returned HTTP 401 without a key.

A read-only public explorer fallback now retrieves real collection and NFT metadata independently of trading data. All fifteen configured inventories responded HTTP 200. Fourteen had original names/images immediately. Land's explorer records lacked metadata, so exact onchain tokenURI reads recovered its Arweave records: all fifty first-page Land parcels then had names, images and traits. Live Wheels pagination returned a subsequent fifty records without rounding the uint256 cursor or repeating the prior page's first token.

Source, retrieval timestamp and market availability stay explicit. ETH and Z-Chain contract identities are preserved. Multiple-copy ERC-1155 Packs do not receive a fabricated singular owner. Explorer counts are observations, not approved supply caps, mint rights or proof of sale availability. First-page verification is not a claim that the entire collection has been downloaded.

Evidence in workspace outputs/ww-originals-data-20261107:
- public-provider-audit.json: all fifteen collection endpoint checks.
- land-token-uri-recovery.json: fifty recovered Land names/images and an exact sample token.
- Implementation-Report.md: this update report.

Details and upstream references are in active checkout docs/originals-data.md.

## Demo trading

Per the updated preview direction, product pages now populate example prices, bids, asks, trade history and charts. The demo market uses a separate module and explicit Demo labels. Buy/sell previews do not execute payments or change ownership; demo records have no fabricated blockchain transaction proof. Real catalog identity and ownership metadata remain separate from illustrative market activity. Production market data, signing and settlement adapters remain unconfigured. Existing local test-account listings and simulated purchases retain their local-only boundaries.

## Image progress

The latest reviewed source coverage is 226 products and 2,034 planned variants:
- 1,642 reviewed visible previews; 160 products have all nine.
- 392 previews remain: jackets 128, hats 72, masks 66, suits 48, accessories 36, tops 30 and glasses 12.
- All 24 bottomwear products now have all nine; 13 of 15 eyewear products are complete.
- 60 products have assigned product-specific lifestyle coverage; 166 remain.

This pass added twelve material renders and two product-specific editorials. Coverage evidence: workspace outputs/ww-reference-fidelity-20261107/runtime-coverage.json. Images and nine-variant concepts are not evidence of implemented game variants.

## Original artwork delivery

Browser QA exposed HTTP 429 from the explorer's default dweb.link gateway (also ipfs.io). The media resolver now retains each immutable IPFS CID while using the public Filebase gateway. Two sampled Wheels originals returned HTTP 200 image/png; a third cold request timed out after twenty seconds. All fifty source Wheels records had thumbnails:null, so no official optimized rendition was available. Cards retain lazy loading; no bulk artwork download was performed. Original files can exceed 5 MB, so reviewed thumbnail caching/CDN delivery remains a production performance task. Gateway verification: workspace outputs/ww-originals-data-20261107/media-gateway-audit.json.

## Validation

Runs are recorded separately and may overlap; do not sum them as unique tests.

| Check | Result | Active-checkout evidence |
| --- | --- | --- |
| Data fallback, identifiers, pagination and indexer integration | 36 tests passed / 7 files | .tmp/collection-tests/originals-data-tests.log |
| Original browse/product UI and deep links | 11 tests passed / 2 files | .tmp/collection-tests/originals-ui-tests.log |
| Shopping navigation and entry points | 23 tests passed / 1 file | .tmp/collection-tests/shopping-entrypoints-tests.log |
| Shared shopping and demo-market integration | 58 tests passed / 8 files | .tmp/collection-tests/shopping-demo-market-tests.log |
| Whole-site TypeScript | No diagnostics in current integration log | .tmp/collection-tests/shopping-originals-types.log |
| Final local build | Passed; local server restarted on port 8791 | .tmp/collection-tests/shopping-originals-build.log |
| Browser checks | Passed for desktop homepage, Wheels browse/product/traits, demo history and footer Discover navigation; 390 px and 768 px homepage, product preview and original collection filters inspected | Workspace outputs/ww-originals-data-20261107 screenshots |

## Remaining launch decisions and work

Complete the remaining clothing/material and lifestyle coverage, identify the V04 female yoga/leggings source, and continue remaining product-gallery checks. This pass verified the changed layouts, not every catalog item. Configure reviewed production login/database, market provider credentials, authoritative ownership/usage-state checks and execution interfaces. Original metadata fetching does not grant listing or mint permissions. Review moderation/publication and verified-purchase evidence still require production services.

Preserve the original contract grouping: Vehicles includes vehicles and rims; Clothing includes clothing/accessories and the separate Totems web section; Furniture holds complete placeable objects. The six-tier nine-variant edition allocation remains proposed, with approved caps and mint permissions unresolved. Reconcile the recorded contract-upgradeability requirement and complete independent security review before launch. Historical token/economy handoff files remain untouched.

