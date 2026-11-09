# Original collections data integration

Local implementation verified 2026-11-07. No publishing, signing, purchase, minting or deployment.

## Why the old page was empty

The registry and provider implementation in the active checkout match the accessible GitHub source at https://github.com/jeanclawdvd-bot/cypher-website (master). It configures eleven Ethereum collections through OpenSea and four Z-Chain collections through the private inventory indexer. The active local environment has neither provider configured. The existing public Vercel deployment also returned empty collection enrichment and HTTP 502 for NFT inventory. A direct OpenSea request returned HTTP 401, requiring an API key. No secret values were read into logs or added to source.

## Read-only catalog fallback

- Ethereum metadata: https://eth.blockscout.com/api/v2/tokens/{contract}/instances
- Z-Chain metadata: https://z-chain-blockscout.eu-north-2.gateway.fm/api/v2/tokens/{contract}/instances
- Contract addresses and chains remain the existing registry's authoritative identities.
- Browse uses explicit status=all, independent of sale availability. Configured OpenSea/indexer providers remain first choice; public explorer metadata is the fallback.
- Single-token pages fetch the exact contract and token ID. Mismatched query contract/chain values are rejected. Explorer records are checked against the configured contract.
- NFTs and responses expose source, retrieval timestamp and market-data availability. Explorer results never claim a listing, sale price, purchase eligibility, game entitlement or mint permission.
- Observed owners are shown only for unique instances. ERC-1155 multi-copy assets do not receive a fabricated singular owner.
- Exact uint256 IDs stay strings. Blockscout's numeric pagination key is preserved before JSON parsing and scoped to its collection/chain in the cursor; the next-page request does not round it. Provider cursors are never silently reused or restarted against another provider.
- Requests use fixed public provider origins, a ten-second timeout, bounded response length and a five-minute in-memory/request cache. Upstream rate limits or unavailable metadata remain explicit failures rather than empty successful collections.

API documentation: https://docs.blockscout.com/devs/blockscout-api and https://github.com/blockscout/agent-skills/blob/main/blockscout-analysis/references/blockscout-api/tokens.md. Z-Chain explorer identity is also published at https://thirdweb.com/z-chain (chain ID 9369). A reviewed production provider agreement/credentials should replace reliance on public explorer availability before launch.

## Coverage and validation

All fifteen configured collection inventory endpoints returned HTTP 200 during the live audit. Fourteen returned actual token names and images directly. Land initially returned authentic token IDs and observed owners but missing metadata/images. A read-only Ethereum tokenURI query recovered the exact Arweave URIs; the adapter now resolves all fifty first-page Land names/images/traits (verified live in 4.6 seconds). The URI calls are restricted to the configured Land contract and known Arweave gateway; owner information remains explorer-sourced and metadata evidence is separately marked onchain-token-uri. Arweave/IPFS media now resolve to supported HTTP URLs. The Packs contract currently returns a single ERC-1155 token design, rather than pretending every copy is a separate ERC-721 token.

The audit is saved at workspace outputs/ww-originals-data-20261107/public-provider-audit.json. First-page coverage is discovery evidence, not a claim that the full collection was downloaded. Live Wheels pagination returned a second page of fifty tokens without repeating the previous page's first token.

Thirty-six tests across seven files passed in .tmp/collection-tests/originals-data-tests.log. They cover exact uint256 cursor handling, cross-collection cursor rejection, contract identity, unknown-price preservation, unique versus multi-copy ownership, provider failures, browse-all fallback, listing-query separation, existing indexer pagination and hook behavior. Visual/whole-site validation is tracked by the integration task.

## Original artwork delivery

Browser QA exposed HTTP 429 from the explorer's default dweb.link gateway (also ipfs.io). The media resolver now retains each immutable IPFS CID while using the public Filebase gateway. Two sampled Wheels originals returned HTTP 200 image/png; a third cold request timed out after twenty seconds. All fifty source Wheels records had thumbnails:null, so no official optimized rendition was available. Cards retain lazy loading; no bulk artwork download was performed. Original files can exceed 5 MB, so reviewed thumbnail caching/CDN delivery remains a production performance task. Gateway verification: workspace outputs/ww-originals-data-20261107/media-gateway-audit.json.

## Still unresolved

- Live OpenSea orders/prices and private indexer enrichment require configured production providers.
- Land metadata recovery depends on the public Ethereum RPC and Arweave availability. Failed fields remain unresolved; no replacement image or invented name is substituted. The live recovery audit is outputs/ww-originals-data-20261107/land-token-uri-recovery.json.
- Contract-level counts are observations, not approved edition caps or new mint rights.
- Mock trading in the product UI must stay separately labeled; it cannot alter catalog provenance or ownership.
