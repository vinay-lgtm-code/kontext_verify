-- ============================================================================
-- 003: Payment Instrument Abstraction — "Tokens Are Tokens"
-- ============================================================================
-- Adds unified payment instrument model and card-specific columns.
-- All nullable. Zero impact on existing rows.

-- Payment instrument columns (unified model)
ALTER TABLE verification_events
  ADD COLUMN IF NOT EXISTS instrument_id          TEXT,
  ADD COLUMN IF NOT EXISTS instrument_type        TEXT,
  ADD COLUMN IF NOT EXISTS instrument_network     TEXT,
  ADD COLUMN IF NOT EXISTS instrument_issuer      TEXT,
  ADD COLUMN IF NOT EXISTS instrument_scope       JSONB;

-- Card-specific columns (denormalized for query performance)
ALTER TABLE verification_events
  ADD COLUMN IF NOT EXISTS payment_card_last4             CHAR(4),
  ADD COLUMN IF NOT EXISTS payment_merchant_category_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_merchant_name          TEXT,
  ADD COLUMN IF NOT EXISTS payment_merchant_country       CHAR(2),
  ADD COLUMN IF NOT EXISTS payment_three_d_secure         TEXT,
  ADD COLUMN IF NOT EXISTS payment_card_authorization_id  TEXT;

-- Evidence bundle extensions
ALTER TABLE evidence_bundles
  ADD COLUMN IF NOT EXISTS instrument_id          TEXT,
  ADD COLUMN IF NOT EXISTS instrument_issuer      TEXT,
  ADD COLUMN IF NOT EXISTS card_authorization_id  TEXT,
  ADD COLUMN IF NOT EXISTS card_3ds_status        TEXT,
  ADD COLUMN IF NOT EXISTS merchant_screened_name TEXT,
  ADD COLUMN IF NOT EXISTS scope_evaluation       JSONB;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_ve_card_auth_unique
  ON verification_events(org_id, payment_card_authorization_id)
  WHERE payment_card_authorization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ve_instrument_type
  ON verification_events(org_id, instrument_type);

CREATE INDEX IF NOT EXISTS idx_ve_instrument_issuer
  ON verification_events(org_id, instrument_issuer);

CREATE INDEX IF NOT EXISTS idx_ve_mcc
  ON verification_events(org_id, payment_merchant_category_code)
  WHERE payment_merchant_category_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ve_payment_rail
  ON verification_events(org_id, payment_rail);
