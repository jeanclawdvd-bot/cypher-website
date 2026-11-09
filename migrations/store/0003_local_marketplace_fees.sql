-- LOCAL simulation only. Existing records retain the fee-free terms they were created under.
-- Recreated guards cover the newly persisted fee snapshot as well as existing immutable fields.
DROP TRIGGER store_listing_immutable;
DROP TRIGGER store_sales_immutable;

ALTER TABLE store_listings ADD COLUMN fee_policy_version TEXT NOT NULL DEFAULT 'legacy-zero';
ALTER TABLE store_listings ADD COLUMN seller_fee_bps INTEGER NOT NULL DEFAULT 0 CHECK(typeof(seller_fee_bps)='integer' AND seller_fee_bps BETWEEN 0 AND 10000);
ALTER TABLE store_listings ADD COLUMN seller_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(seller_fee_cents)='integer' AND seller_fee_cents>=0);
ALTER TABLE store_listings ADD COLUMN seller_proceeds_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(seller_proceeds_cents)='integer' AND seller_proceeds_cents>=0);
UPDATE store_listings SET seller_proceeds_cents=price_cents;

ALTER TABLE store_sales ADD COLUMN fee_policy_version TEXT NOT NULL DEFAULT 'legacy-zero';
ALTER TABLE store_sales ADD COLUMN seller_fee_bps INTEGER NOT NULL DEFAULT 0 CHECK(typeof(seller_fee_bps)='integer' AND seller_fee_bps BETWEEN 0 AND 10000);
ALTER TABLE store_sales ADD COLUMN seller_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(seller_fee_cents)='integer' AND seller_fee_cents>=0);
ALTER TABLE store_sales ADD COLUMN seller_proceeds_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(seller_proceeds_cents)='integer' AND seller_proceeds_cents>=0);
UPDATE store_sales SET seller_proceeds_cents=price_cents;

CREATE TRIGGER store_listing_fee_valid BEFORE INSERT ON store_listings BEGIN
  SELECT CASE WHEN NEW.fee_policy_version<>'2026-11-08-seller-1pct' OR NEW.seller_fee_bps<>100
    OR NEW.seller_fee_cents<>(NEW.price_cents*NEW.seller_fee_bps+5000)/10000
    OR NEW.seller_proceeds_cents<>NEW.price_cents-NEW.seller_fee_cents
    THEN RAISE(ABORT,'listing_fee_invalid') END;
END;

CREATE TRIGGER store_listing_immutable BEFORE UPDATE ON store_listings BEGIN
  SELECT CASE WHEN NEW.id<>OLD.id OR NEW.item_id<>OLD.item_id OR NEW.seller_id<>OLD.seller_id
    OR NEW.price_cents<>OLD.price_cents OR NEW.currency<>OLD.currency OR NEW.created_at<>OLD.created_at
    OR NEW.fee_policy_version<>OLD.fee_policy_version OR NEW.seller_fee_bps<>OLD.seller_fee_bps
    OR NEW.seller_fee_cents<>OLD.seller_fee_cents OR NEW.seller_proceeds_cents<>OLD.seller_proceeds_cents
    OR OLD.status<>'active' OR NEW.status NOT IN ('cancelled','sold')
    THEN RAISE(ABORT,'listing_immutable') END;
END;

CREATE TRIGGER store_sale_fee_matches_listing BEFORE INSERT ON store_sales BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM store_listings l WHERE l.id=NEW.listing_id
      AND NEW.fee_policy_version=l.fee_policy_version AND NEW.seller_fee_bps=l.seller_fee_bps
      AND NEW.seller_fee_cents=l.seller_fee_cents AND NEW.seller_proceeds_cents=l.seller_proceeds_cents
      AND NEW.seller_fee_cents+NEW.seller_proceeds_cents=NEW.price_cents
  ) THEN RAISE(ABORT,'listing_fee_mismatch') END;
END;

CREATE TRIGGER store_sales_immutable BEFORE UPDATE ON store_sales
BEGIN SELECT RAISE(ABORT,'sale_immutable'); END;
