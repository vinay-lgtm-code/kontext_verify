-- ============================================================================
-- 004: Subscriptions & API Key Management
-- ============================================================================

-- api_keys — API key to org mapping + plan tier
CREATE TABLE IF NOT EXISTS api_keys (
  api_key       TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES orgs(org_id),
  label         TEXT,
  plan          TEXT NOT NULL DEFAULT 'pilot',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);

-- subscriptions — billing state per org
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES orgs(org_id),
  plan                  TEXT NOT NULL DEFAULT 'pilot' CHECK (plan IN ('pilot', 'startup')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  amount_cents          INTEGER NOT NULL DEFAULT 0,
  currency              TEXT NOT NULL DEFAULT 'USD',
  payment_rail          TEXT NOT NULL DEFAULT 'none' CHECK (payment_rail IN ('none', 'stripe', 'circle', 'base_wallet')),
  -- Stripe-specific
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  -- Circle/crypto-specific
  payment_wallet_address TEXT,
  payment_chain         TEXT,
  payment_token         TEXT,
  payment_tx_hash       TEXT,
  -- Tracking
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
