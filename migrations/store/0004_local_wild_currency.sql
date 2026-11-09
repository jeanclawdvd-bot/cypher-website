-- LOCAL simulation only. D1 migrations execute transactionally; preserve original USD records verbatim.
-- Node/SQLite validation must execute this entire migration inside one transaction as D1 does.
-- Keep whitespace around nested CASE/END: Wrangler must recognize each compound statement before splitting.
PRAGMA defer_foreign_keys=ON;
DROP TRIGGER store_listing_requires_owner;
DROP TRIGGER store_listing_immutable;
DROP TRIGGER store_listing_prevents_usage_change;
DROP TRIGGER store_sale_requires_available;
DROP TRIGGER store_sale_transfer;
DROP TRIGGER store_sales_immutable;
DROP TRIGGER store_listing_fee_valid;
DROP TRIGGER store_sale_fee_matches_listing;
CREATE TABLE store_listings_v4 (
 id TEXT PRIMARY KEY,item_id TEXT NOT NULL REFERENCES store_items(id),seller_id TEXT NOT NULL REFERENCES store_users(id),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled','sold')),created_at TEXT NOT NULL,closed_at TEXT,
 price_cents INTEGER, currency TEXT NOT NULL CHECK(currency IN ('USD','WILD')),
 amount_atomic TEXT NOT NULL CHECK(typeof(amount_atomic)='text' AND length(amount_atomic) BETWEEN 1 AND 78 AND amount_atomic NOT GLOB '*[^0-9]*' AND (length(amount_atomic)=1 OR substr(amount_atomic,1,1)<>'0') AND (length(amount_atomic)<78 OR amount_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935') AND amount_atomic<>'0'),
 fee_policy_version TEXT NOT NULL,seller_fee_bps INTEGER NOT NULL CHECK(typeof(seller_fee_bps)='integer' AND seller_fee_bps BETWEEN 0 AND 10000),
 seller_fee_cents INTEGER,seller_proceeds_cents INTEGER,
 seller_fee_atomic TEXT NOT NULL CHECK(typeof(seller_fee_atomic)='text' AND length(seller_fee_atomic) BETWEEN 1 AND 78 AND seller_fee_atomic NOT GLOB '*[^0-9]*' AND (length(seller_fee_atomic)=1 OR substr(seller_fee_atomic,1,1)<>'0') AND (length(seller_fee_atomic)<78 OR seller_fee_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935')),seller_proceeds_atomic TEXT NOT NULL CHECK(typeof(seller_proceeds_atomic)='text' AND length(seller_proceeds_atomic) BETWEEN 1 AND 78 AND seller_proceeds_atomic NOT GLOB '*[^0-9]*' AND (length(seller_proceeds_atomic)=1 OR substr(seller_proceeds_atomic,1,1)<>'0') AND (length(seller_proceeds_atomic)<78 OR seller_proceeds_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935')),
 CHECK((currency='USD' AND typeof(price_cents)='integer' AND price_cents BETWEEN 1 AND 100000000 AND amount_atomic=CAST(price_cents AS TEXT)
   AND seller_fee_atomic=CAST(seller_fee_cents AS TEXT) AND seller_proceeds_atomic=CAST(seller_proceeds_cents AS TEXT))
 OR (currency='WILD' AND price_cents IS NULL AND seller_fee_cents IS NULL AND seller_proceeds_cents IS NULL))
);
CREATE TABLE store_sales_v4 (
 id TEXT PRIMARY KEY,listing_id TEXT NOT NULL UNIQUE REFERENCES store_listings(id),item_id TEXT NOT NULL REFERENCES store_items(id),
 product_id TEXT NOT NULL,variant_id TEXT NOT NULL,buyer_id TEXT NOT NULL REFERENCES store_users(id),seller_id TEXT NOT NULL REFERENCES store_users(id),
 idempotency_key TEXT NOT NULL,request_fingerprint TEXT NOT NULL,created_at TEXT NOT NULL,
 payment_status TEXT NOT NULL DEFAULT 'simulated' CHECK(payment_status='simulated'),settlement_status TEXT NOT NULL DEFAULT 'simulated' CHECK(settlement_status='simulated'),entitlement_status TEXT NOT NULL DEFAULT 'not_issued' CHECK(entitlement_status='not_issued'),
 quote_id TEXT UNIQUE REFERENCES store_purchase_quotes(id),payment_currency TEXT NOT NULL CHECK(payment_currency IN ('USD','WILD')),
 payment_amount_atomic TEXT NOT NULL CHECK(typeof(payment_amount_atomic)='text' AND length(payment_amount_atomic) BETWEEN 1 AND 78 AND payment_amount_atomic NOT GLOB '*[^0-9]*' AND (length(payment_amount_atomic)=1 OR substr(payment_amount_atomic,1,1)<>'0') AND (length(payment_amount_atomic)<78 OR payment_amount_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935') AND payment_amount_atomic<>'0'),
 price_cents INTEGER, currency TEXT NOT NULL CHECK(currency IN ('USD','WILD')),
 amount_atomic TEXT NOT NULL CHECK(typeof(amount_atomic)='text' AND length(amount_atomic) BETWEEN 1 AND 78 AND amount_atomic NOT GLOB '*[^0-9]*' AND (length(amount_atomic)=1 OR substr(amount_atomic,1,1)<>'0') AND (length(amount_atomic)<78 OR amount_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935') AND amount_atomic<>'0'),
 fee_policy_version TEXT NOT NULL,seller_fee_bps INTEGER NOT NULL CHECK(typeof(seller_fee_bps)='integer' AND seller_fee_bps BETWEEN 0 AND 10000),
 seller_fee_cents INTEGER,seller_proceeds_cents INTEGER,
 seller_fee_atomic TEXT NOT NULL CHECK(typeof(seller_fee_atomic)='text' AND length(seller_fee_atomic) BETWEEN 1 AND 78 AND seller_fee_atomic NOT GLOB '*[^0-9]*' AND (length(seller_fee_atomic)=1 OR substr(seller_fee_atomic,1,1)<>'0') AND (length(seller_fee_atomic)<78 OR seller_fee_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935')),seller_proceeds_atomic TEXT NOT NULL CHECK(typeof(seller_proceeds_atomic)='text' AND length(seller_proceeds_atomic) BETWEEN 1 AND 78 AND seller_proceeds_atomic NOT GLOB '*[^0-9]*' AND (length(seller_proceeds_atomic)=1 OR substr(seller_proceeds_atomic,1,1)<>'0') AND (length(seller_proceeds_atomic)<78 OR seller_proceeds_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935')),
 CHECK((currency='USD' AND typeof(price_cents)='integer' AND price_cents BETWEEN 1 AND 100000000 AND amount_atomic=CAST(price_cents AS TEXT)
   AND seller_fee_atomic=CAST(seller_fee_cents AS TEXT) AND seller_proceeds_atomic=CAST(seller_proceeds_cents AS TEXT))
 OR (currency='WILD' AND price_cents IS NULL AND seller_fee_cents IS NULL AND seller_proceeds_cents IS NULL)),
 UNIQUE(buyer_id,idempotency_key),CHECK(buyer_id<>seller_id)
);
CREATE TABLE store_purchase_quotes (
 id TEXT PRIMARY KEY,listing_id TEXT NOT NULL REFERENCES store_listings(id),buyer_id TEXT NOT NULL REFERENCES store_users(id),
 listing_currency TEXT NOT NULL CHECK(listing_currency IN ('USD','WILD')),listing_amount_atomic TEXT NOT NULL CHECK(typeof(listing_amount_atomic)='text' AND length(listing_amount_atomic) BETWEEN 1 AND 78 AND listing_amount_atomic NOT GLOB '*[^0-9]*' AND (length(listing_amount_atomic)=1 OR substr(listing_amount_atomic,1,1)<>'0') AND (length(listing_amount_atomic)<78 OR listing_amount_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935') AND listing_amount_atomic<>'0'),
 payment_currency TEXT NOT NULL CHECK(payment_currency IN ('USD','WILD')),payment_amount_atomic TEXT NOT NULL CHECK(typeof(payment_amount_atomic)='text' AND length(payment_amount_atomic) BETWEEN 1 AND 78 AND payment_amount_atomic NOT GLOB '*[^0-9]*' AND (length(payment_amount_atomic)=1 OR substr(payment_amount_atomic,1,1)<>'0') AND (length(payment_amount_atomic)<78 OR payment_amount_atomic<='115792089237316195423570985008687907853269984665640564039457584007913129639935') AND payment_amount_atomic<>'0'),
 rate_id TEXT NOT NULL CHECK(rate_id='ui-demo-wild-usd-10c-v1'),usd_cents_per_wild TEXT NOT NULL CHECK(usd_cents_per_wild='10'),
 created_at TEXT NOT NULL,expires_at TEXT NOT NULL
);
CREATE INDEX store_quotes_buyer ON store_purchase_quotes(buyer_id,created_at);
INSERT INTO store_listings_v4(id,item_id,seller_id,status,created_at,closed_at,price_cents,currency,amount_atomic,fee_policy_version,seller_fee_bps,seller_fee_cents,seller_proceeds_cents,seller_fee_atomic,seller_proceeds_atomic)
 SELECT id,item_id,seller_id,status,created_at,closed_at,price_cents,currency,CAST(price_cents AS TEXT),fee_policy_version,seller_fee_bps,seller_fee_cents,seller_proceeds_cents,CAST(seller_fee_cents AS TEXT),CAST(seller_proceeds_cents AS TEXT) FROM store_listings;
INSERT INTO store_sales_v4(id,listing_id,item_id,product_id,variant_id,buyer_id,seller_id,idempotency_key,request_fingerprint,created_at,payment_status,settlement_status,entitlement_status,quote_id,payment_currency,payment_amount_atomic,price_cents,currency,amount_atomic,fee_policy_version,seller_fee_bps,seller_fee_cents,seller_proceeds_cents,seller_fee_atomic,seller_proceeds_atomic)
 SELECT id,listing_id,item_id,product_id,variant_id,buyer_id,seller_id,idempotency_key,request_fingerprint,created_at,payment_status,settlement_status,entitlement_status,NULL,currency,CAST(price_cents AS TEXT),price_cents,currency,CAST(price_cents AS TEXT),fee_policy_version,seller_fee_bps,seller_fee_cents,seller_proceeds_cents,CAST(seller_fee_cents AS TEXT),CAST(seller_proceeds_cents AS TEXT) FROM store_sales;
DROP TABLE store_sales;
DROP TABLE store_listings;
ALTER TABLE store_listings_v4 RENAME TO store_listings;
ALTER TABLE store_sales_v4 RENAME TO store_sales;
CREATE UNIQUE INDEX store_one_active_listing ON store_listings(item_id) WHERE status='active';
CREATE INDEX store_listings_seller ON store_listings(seller_id,created_at);
CREATE INDEX store_sales_buyer ON store_sales(buyer_id,created_at);
CREATE INDEX store_sales_seller ON store_sales(seller_id,created_at);
CREATE TRIGGER store_listing_requires_owner BEFORE INSERT ON store_listings BEGIN
 SELECT  CASE  WHEN NEW.currency<>'WILD' OR NEW.status<>'active' OR NOT EXISTS(SELECT 1 FROM store_items WHERE id=NEW.item_id AND owner_id=NEW.seller_id AND usage='unlocked') THEN RAISE(ABORT,'item_unavailable')  END ;
 END ;
CREATE TRIGGER store_listing_fee_valid BEFORE INSERT ON store_listings BEGIN
 SELECT  CASE  WHEN NEW.fee_policy_version<>'2026-11-08-seller-1pct' OR NEW.seller_fee_bps<>100 OR NEW.seller_fee_atomic<>(WITH RECURSIVE d(p,c,s,q) AS (SELECT length( CASE  WHEN length(NEW.amount_atomic)>2 THEN substr(NEW.amount_atomic,1,length(NEW.amount_atomic)-2) ELSE '0'  END ), CASE  WHEN CAST(substr('00'||NEW.amount_atomic,-2) AS INTEGER)>=50 THEN 1 ELSE 0  END ,'', CASE  WHEN length(NEW.amount_atomic)>2 THEN substr(NEW.amount_atomic,1,length(NEW.amount_atomic)-2) ELSE '0'  END  UNION ALL SELECT p-1,(CAST(substr(q,p,1) AS INTEGER)+c)/10,CAST((CAST(substr(q,p,1) AS INTEGER)+c)%10 AS TEXT)||s,q FROM d WHERE p>0) SELECT COALESCE(NULLIF(ltrim(CAST(c AS TEXT)||s,'0'),''),'0') FROM d WHERE p=0) OR NEW.amount_atomic<>(WITH RECURSIVE d(p,c,s) AS (SELECT 1,0,'' UNION ALL SELECT p+1,( CASE  WHEN p<=length(NEW.seller_fee_atomic) THEN CAST(substr(NEW.seller_fee_atomic,-p,1) AS INTEGER) ELSE 0  END + CASE  WHEN p<=length(NEW.seller_proceeds_atomic) THEN CAST(substr(NEW.seller_proceeds_atomic,-p,1) AS INTEGER) ELSE 0  END +c)/10,CAST(( CASE  WHEN p<=length(NEW.seller_fee_atomic) THEN CAST(substr(NEW.seller_fee_atomic,-p,1) AS INTEGER) ELSE 0  END + CASE  WHEN p<=length(NEW.seller_proceeds_atomic) THEN CAST(substr(NEW.seller_proceeds_atomic,-p,1) AS INTEGER) ELSE 0  END +c)%10 AS TEXT)||s FROM d WHERE p<=max(length(NEW.seller_fee_atomic),length(NEW.seller_proceeds_atomic))) SELECT COALESCE(NULLIF(ltrim(CAST(c AS TEXT)||s,'0'),''),'0') FROM d WHERE p>max(length(NEW.seller_fee_atomic),length(NEW.seller_proceeds_atomic))) THEN RAISE(ABORT,'listing_fee_invalid')  END ;
 END ;
CREATE TRIGGER store_listing_immutable BEFORE UPDATE ON store_listings BEGIN
 SELECT  CASE  WHEN NEW.id<>OLD.id OR NEW.item_id<>OLD.item_id OR NEW.seller_id<>OLD.seller_id OR NEW.currency<>OLD.currency OR NEW.amount_atomic<>OLD.amount_atomic OR NEW.price_cents IS NOT OLD.price_cents OR NEW.created_at<>OLD.created_at
 OR NEW.fee_policy_version<>OLD.fee_policy_version OR NEW.seller_fee_bps<>OLD.seller_fee_bps OR NEW.seller_fee_cents IS NOT OLD.seller_fee_cents OR NEW.seller_proceeds_cents IS NOT OLD.seller_proceeds_cents OR NEW.seller_fee_atomic<>OLD.seller_fee_atomic OR NEW.seller_proceeds_atomic<>OLD.seller_proceeds_atomic
 OR OLD.status<>'active' OR NEW.status NOT IN ('cancelled','sold') THEN RAISE(ABORT,'listing_immutable')  END ;
 END ;
CREATE TRIGGER store_listing_prevents_usage_change BEFORE UPDATE OF usage ON store_items WHEN NEW.usage<>OLD.usage AND EXISTS(SELECT 1 FROM store_listings WHERE item_id=OLD.id AND status='active') BEGIN SELECT RAISE(ABORT,'item_listed');  END ;
CREATE TRIGGER store_quote_valid BEFORE INSERT ON store_purchase_quotes BEGIN
 SELECT  CASE  WHEN NOT EXISTS(SELECT 1 FROM store_listings l JOIN store_items i ON i.id=l.item_id WHERE l.id=NEW.listing_id AND l.status='active' AND l.seller_id<>NEW.buyer_id AND i.owner_id=l.seller_id AND i.usage='unlocked' AND l.amount_atomic=NEW.listing_amount_atomic AND l.currency=NEW.listing_currency)
 OR julianday(NEW.created_at) IS NULL OR julianday(NEW.expires_at) IS NULL OR julianday(NEW.created_at)>julianday('now')+5.0/86400 OR julianday(NEW.created_at)<julianday('now')-5.0/86400 OR julianday(NEW.expires_at)<=julianday(NEW.created_at) OR julianday(NEW.expires_at)>julianday(NEW.created_at)+301.0/86400
 OR NEW.payment_amount_atomic<> CASE  WHEN NEW.payment_currency=NEW.listing_currency THEN NEW.listing_amount_atomic WHEN NEW.listing_currency='WILD' THEN (WITH RECURSIVE d(p,c,s,q) AS (SELECT length( CASE  WHEN length(NEW.listing_amount_atomic)>17 THEN substr(NEW.listing_amount_atomic,1,length(NEW.listing_amount_atomic)-17) ELSE '0'  END ), CASE  WHEN ltrim(substr('00000000000000000'||NEW.listing_amount_atomic,-17),'0')<>'' THEN 1 ELSE 0  END ,'', CASE  WHEN length(NEW.listing_amount_atomic)>17 THEN substr(NEW.listing_amount_atomic,1,length(NEW.listing_amount_atomic)-17) ELSE '0'  END  UNION ALL SELECT p-1,(CAST(substr(q,p,1) AS INTEGER)+c)/10,CAST((CAST(substr(q,p,1) AS INTEGER)+c)%10 AS TEXT)||s,q FROM d WHERE p>0) SELECT COALESCE(NULLIF(ltrim(CAST(c AS TEXT)||s,'0'),''),'0') FROM d WHERE p=0) ELSE NEW.listing_amount_atomic||'00000000000000000'  END 
 THEN RAISE(ABORT,'quote_invalid')  END ;
 END ;
CREATE TRIGGER store_quote_immutable BEFORE UPDATE ON store_purchase_quotes BEGIN SELECT RAISE(ABORT,'quote_immutable');  END ;
CREATE TRIGGER store_quote_no_delete BEFORE DELETE ON store_purchase_quotes BEGIN SELECT RAISE(ABORT,'quote_immutable');  END ;
CREATE TRIGGER store_sale_requires_available BEFORE INSERT ON store_sales BEGIN
 SELECT  CASE  WHEN NOT EXISTS(SELECT 1 FROM store_listings l JOIN store_items i ON i.id=l.item_id WHERE l.id=NEW.listing_id AND l.status='active' AND i.id=NEW.item_id AND l.seller_id=NEW.seller_id AND i.owner_id=NEW.seller_id AND i.usage='unlocked' AND l.amount_atomic=NEW.amount_atomic AND l.currency=NEW.currency AND l.price_cents IS NEW.price_cents AND i.product_id=NEW.product_id AND i.variant_id=NEW.variant_id AND NEW.buyer_id<>NEW.seller_id) THEN RAISE(ABORT,'listing_unavailable')  END ;
 END ;
CREATE TRIGGER store_sale_fee_matches_listing BEFORE INSERT ON store_sales BEGIN
 SELECT  CASE  WHEN NOT EXISTS(SELECT 1 FROM store_listings l WHERE l.id=NEW.listing_id AND NEW.fee_policy_version=l.fee_policy_version AND NEW.seller_fee_bps=l.seller_fee_bps AND NEW.seller_fee_atomic=l.seller_fee_atomic AND NEW.seller_proceeds_atomic=l.seller_proceeds_atomic AND NEW.seller_fee_cents IS l.seller_fee_cents AND NEW.seller_proceeds_cents IS l.seller_proceeds_cents) THEN RAISE(ABORT,'listing_fee_mismatch')  END ;
 END ;
CREATE TRIGGER store_sale_quote_matches BEFORE INSERT ON store_sales BEGIN
 SELECT  CASE  WHEN NOT EXISTS(SELECT 1 FROM store_purchase_quotes q WHERE q.id=NEW.quote_id AND q.listing_id=NEW.listing_id AND q.buyer_id=NEW.buyer_id AND q.listing_currency=NEW.currency AND q.listing_amount_atomic=NEW.amount_atomic AND q.payment_currency=NEW.payment_currency AND q.payment_amount_atomic=NEW.payment_amount_atomic AND julianday(q.expires_at)>julianday('now') AND julianday(NEW.created_at)>=julianday(q.created_at) AND julianday(NEW.created_at)<julianday(q.expires_at)) THEN RAISE(ABORT,'quote_unavailable')  END ;
 END ;
CREATE TRIGGER store_sale_transfer AFTER INSERT ON store_sales BEGIN
 UPDATE store_listings SET status='sold',closed_at=NEW.created_at WHERE id=NEW.listing_id;
 UPDATE store_items SET owner_id=NEW.buyer_id,acquired_at=NEW.created_at WHERE id=NEW.item_id;
 END ;
CREATE TRIGGER store_sales_immutable BEFORE UPDATE ON store_sales BEGIN SELECT RAISE(ABORT,'sale_immutable');  END ;
-- A table rebuild can leave SQLite's deferred counter set after all renamed-table
-- references resolve. Verify every actual FK before resetting that counter.
CREATE TABLE store_currency_migration_check (violations INTEGER CHECK(violations=0));
INSERT INTO store_currency_migration_check SELECT count(*) FROM pragma_foreign_key_check;
DROP TABLE store_currency_migration_check;
PRAGMA defer_foreign_keys=OFF;
