-- Dedicated LOCAL store database. Never a production payment or token ownership ledger.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS store_users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '', password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
  password_scheme TEXT NOT NULL DEFAULT 'scrypt-n32768-r8-p3', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS store_sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES store_users(id),
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS store_sessions_user ON store_sessions(user_id);
CREATE TABLE IF NOT EXISTS store_rate_limits (
  bucket TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL CHECK(attempts > 0)
);
CREATE TABLE IF NOT EXISTS store_seed_claims (
  user_id TEXT PRIMARY KEY REFERENCES store_users(id), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES store_users(id),
  product_id TEXT NOT NULL, variant_id TEXT NOT NULL, name TEXT NOT NULL, variant_name TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source = 'local_seed'), usage TEXT NOT NULL DEFAULT 'unlocked'
    CHECK(usage IN ('unlocked','equipped','installed','placed')),
  acquired_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS store_items_owner ON store_items(owner_id);
CREATE TABLE IF NOT EXISTS store_listings (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES store_items(id),
  seller_id TEXT NOT NULL REFERENCES store_users(id), price_cents INTEGER NOT NULL
    CHECK(typeof(price_cents)='integer' AND price_cents BETWEEN 1 AND 100000000),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled','sold')),
  created_at TEXT NOT NULL, closed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS store_one_active_listing ON store_listings(item_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS store_listings_seller ON store_listings(seller_id,created_at);
CREATE TABLE IF NOT EXISTS store_sales (
  id TEXT PRIMARY KEY, listing_id TEXT NOT NULL UNIQUE REFERENCES store_listings(id),
  item_id TEXT NOT NULL REFERENCES store_items(id), product_id TEXT NOT NULL, variant_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL REFERENCES store_users(id), seller_id TEXT NOT NULL REFERENCES store_users(id),
  price_cents INTEGER NOT NULL CHECK(typeof(price_cents)='integer' AND price_cents BETWEEN 1 AND 100000000),
  currency TEXT NOT NULL CHECK(currency='USD'), idempotency_key TEXT NOT NULL, request_fingerprint TEXT NOT NULL, created_at TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'simulated' CHECK(payment_status='simulated'),
  settlement_status TEXT NOT NULL DEFAULT 'simulated' CHECK(settlement_status='simulated'),
  entitlement_status TEXT NOT NULL DEFAULT 'not_issued' CHECK(entitlement_status='not_issued'),
  UNIQUE(buyer_id,idempotency_key), CHECK(buyer_id <> seller_id)
);
CREATE INDEX IF NOT EXISTS store_sales_buyer ON store_sales(buyer_id,created_at);
CREATE INDEX IF NOT EXISTS store_sales_seller ON store_sales(seller_id,created_at);
CREATE TABLE IF NOT EXISTS store_reviews (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES store_users(id), product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK(typeof(rating)='integer' AND rating BETWEEN 1 AND 5),
  title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL,
  moderation TEXT NOT NULL DEFAULT 'pending' CHECK(moderation IN ('pending','published','rejected')),
  ownership_at_submission INTEGER NOT NULL CHECK(ownership_at_submission IN (0,1)),
  local_purchase_id TEXT REFERENCES store_sales(id),
  UNIQUE(user_id,product_id,variant_id)
);
CREATE INDEX IF NOT EXISTS store_reviews_product ON store_reviews(product_id,moderation,created_at);

-- Inventory state and listing checks live in SQLite as well as the HTTP boundary.
CREATE TRIGGER IF NOT EXISTS store_listing_requires_owner BEFORE INSERT ON store_listings BEGIN
  SELECT CASE WHEN NEW.status <> 'active' OR NOT EXISTS (
    SELECT 1 FROM store_items WHERE id=NEW.item_id AND owner_id=NEW.seller_id AND usage='unlocked'
  ) THEN RAISE(ABORT,'item_unavailable') END;
END;
CREATE TRIGGER IF NOT EXISTS store_listing_immutable BEFORE UPDATE ON store_listings BEGIN
  SELECT CASE WHEN NEW.id <> OLD.id OR NEW.item_id <> OLD.item_id OR NEW.seller_id <> OLD.seller_id
    OR NEW.price_cents <> OLD.price_cents OR NEW.currency <> OLD.currency OR NEW.created_at <> OLD.created_at
    OR OLD.status <> 'active' OR NEW.status NOT IN ('cancelled','sold')
    THEN RAISE(ABORT,'listing_immutable') END;
END;
CREATE TRIGGER IF NOT EXISTS store_listing_prevents_usage_change BEFORE UPDATE OF usage ON store_items
WHEN NEW.usage <> OLD.usage AND EXISTS(SELECT 1 FROM store_listings WHERE item_id=OLD.id AND status='active')
BEGIN SELECT RAISE(ABORT,'item_listed'); END;
CREATE TRIGGER IF NOT EXISTS store_sale_requires_available BEFORE INSERT ON store_sales BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM store_listings l JOIN store_items i ON i.id=l.item_id
    WHERE l.id=NEW.listing_id AND l.status='active' AND i.id=NEW.item_id
      AND l.seller_id=NEW.seller_id AND i.owner_id=NEW.seller_id AND i.usage='unlocked'
      AND l.price_cents=NEW.price_cents AND l.currency=NEW.currency
      AND i.product_id=NEW.product_id AND i.variant_id=NEW.variant_id AND NEW.buyer_id<>NEW.seller_id
  ) THEN RAISE(ABORT,'listing_unavailable') END;
END;
CREATE TRIGGER IF NOT EXISTS store_sale_transfer AFTER INSERT ON store_sales BEGIN
  UPDATE store_listings SET status='sold', closed_at=NEW.created_at WHERE id=NEW.listing_id;
  UPDATE store_items SET owner_id=NEW.buyer_id, acquired_at=NEW.created_at WHERE id=NEW.item_id;
END;
CREATE TRIGGER IF NOT EXISTS store_sales_immutable BEFORE UPDATE ON store_sales
BEGIN SELECT RAISE(ABORT,'sale_immutable'); END;
