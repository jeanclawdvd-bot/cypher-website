# Indicative WILD prices

New catalog products retain their approved USD preview price. Every catalog card and product page derives the smaller WILD estimate from the same validated WILD/USD market feed. Existing seller asks remain denominated in WILD; only their indicative USD display moves. No price display creates a payment, mint, approval, order or entitlement.

`GET /api/market/wild-price` reads DefiLlama's public exact-contract endpoint for Ethereum `0x2a3bff78b79a009976eea096a51a948a3dc00e34`, requiring WILD, 18 decimals and confidence of at least 0.9. If unavailable it tries CoinGecko's exact `wilder-world` API ID, requiring `last_updated_at`. CoinGecko may require an API key; no key is assumed, embedded or exposed. A failed secondary request is simply unavailable.

Provider sources: [DefiLlama price API documentation](https://docs.llama.fi/list-your-project/how-to-request-token-pricing), [CoinGecko simple price documentation](https://docs.coingecko.com/demo/reference/simple-price), [Wilder World identity on CoinGecko](https://www.coingecko.com/en/coins/wilder-world).

Each provider request has a 4.5-second timeout and bounded response size. The server deduplicates concurrent reads and caches success for 60 seconds, failures for 30 seconds. The client shares a single feed across cards and refreshes every minute. Source time—not cache read time—determines freshness: up to five minutes is fresh, five to fifteen minutes is explicitly stale. A failed refresh also marks a retained rate stale. At fifteen minutes the rate is removed and the UI says unavailable. Provider timestamps are visible; there is no fixed or historical fallback. Remote endpoint availability must be verified on the deployment host.

Conversions use integer arithmetic. Catalog WILD display rounds upward to two decimal places; native WILD asks retain their exact 18-decimal amount and their indicative USD display rounds to cents. These estimates are not executable payment quotes.

Local simulated purchase confirmations and the illustrative trading chart retain the separately labeled `$0.10/WILD` fixture used by their immutable test quotes. `DemoWildPriceQuote` is used only in the illustrative market panel. Live indicative display never changes those stored test quotes, historical USD terms or seller fee snapshots. Production settlement must use a separately approved executable quote policy.
