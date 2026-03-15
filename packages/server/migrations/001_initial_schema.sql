-- ============================================================================
-- Kontext v1 — Initial Postgres Schema
-- ============================================================================
-- Schema version: 1.0
-- Digest chain formula (US Patent 12,463,819 B1):
--   HD = SHA-256(HD-1 || Serialize(ED) || SD)

-- ---------------------------------------------------------------------------
-- orgs
-- ---------------------------------------------------------------------------

CREATE TABLE orgs (
  org_id        TEXT PRIMARY KEY,
  org_name      TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'starter',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  active        BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- org_users
-- ---------------------------------------------------------------------------

CREATE TABLE org_users (
  user_id       TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES orgs(org_id),
  email         TEXT NOT NULL,
  role          TEXT NOT NULL,
  permissions   TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

CREATE INDEX idx_org_users_org ON org_users(org_id);

-- ---------------------------------------------------------------------------
-- wallet_registry
-- ---------------------------------------------------------------------------

CREATE TABLE wallet_registry (
  wallet_id         TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES orgs(org_id),
  address           TEXT NOT NULL,
  chain             TEXT NOT NULL,
  label             TEXT,
  monitoring_status TEXT NOT NULL DEFAULT 'monitored',
  registered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, address, chain)
);

CREATE INDEX idx_wallet_registry_org ON wallet_registry(org_id);

-- ---------------------------------------------------------------------------
-- verification_events
-- ---------------------------------------------------------------------------

CREATE TABLE verification_events (
  -- Identity
  event_id          TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES orgs(org_id),
  environment       TEXT NOT NULL,
  event_version     TEXT NOT NULL DEFAULT '1.0',

  -- Status & Timing
  event_type        TEXT NOT NULL DEFAULT 'payout.verification',
  status            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at       TIMESTAMPTZ,

  -- Agent Context
  workflow          TEXT NOT NULL,
  agent_id          TEXT NOT NULL,
  agent_type        TEXT,
  actor_type        TEXT NOT NULL,

  -- Payment (flattened for query performance)
  payment_tx_hash           TEXT,
  payment_chain             TEXT NOT NULL,
  payment_rail              TEXT NOT NULL,
  payment_token             TEXT NOT NULL,
  payment_amount            NUMERIC(36,18) NOT NULL,
  payment_currency          TEXT NOT NULL,
  payment_usd_equivalent    NUMERIC(36,2),
  payment_from_address      TEXT NOT NULL,
  payment_to_address        TEXT NOT NULL,
  payment_destination_country CHAR(2),
  payment_counterparty_id   TEXT,

  -- Intent
  intent_id             TEXT NOT NULL,
  intent_type           TEXT NOT NULL,
  intent_declared_purpose TEXT,
  intent_requested_by   TEXT NOT NULL,
  intent_requested_at   TIMESTAMPTZ NOT NULL,

  -- Policy Result (flattened for KPI queries)
  policy_decision       TEXT NOT NULL,
  policy_version        TEXT,
  policy_violations     TEXT[] NOT NULL DEFAULT '{}',
  policy_warnings       TEXT[] NOT NULL DEFAULT '{}',
  applied_policy_ids    TEXT[] NOT NULL DEFAULT '{}',

  -- Screening Result
  ofac_status           TEXT NOT NULL,
  screened_at           TIMESTAMPTZ,
  screening_provider    TEXT,

  -- Trust Score
  trust_score           SMALLINT NOT NULL CHECK (trust_score BETWEEN 0 AND 100),
  trust_band            TEXT NOT NULL,
  trust_reasons         TEXT[] NOT NULL DEFAULT '{}',

  -- Coverage
  coverage_source       TEXT NOT NULL,
  wallet_monitored      BOOLEAN NOT NULL DEFAULT false,
  chain_listener_confirmed BOOLEAN NOT NULL DEFAULT false,
  coverage_status       TEXT NOT NULL,

  -- Evidence
  evidence_bundle_id    TEXT NOT NULL,

  -- Tenant metadata
  team_tag              TEXT,
  business_unit_tag     TEXT
);

-- KPI strip queries
CREATE INDEX idx_ve_org_created    ON verification_events(org_id, created_at DESC);
CREATE INDEX idx_ve_org_status     ON verification_events(org_id, status);
CREATE INDEX idx_ve_org_ofac       ON verification_events(org_id, ofac_status);
CREATE INDEX idx_ve_org_policy     ON verification_events(org_id, policy_decision);
CREATE INDEX idx_ve_agent          ON verification_events(org_id, agent_id);
CREATE INDEX idx_ve_coverage       ON verification_events(org_id, coverage_status);
CREATE INDEX idx_ve_chain          ON verification_events(org_id, payment_chain);
CREATE INDEX idx_ve_country        ON verification_events(org_id, payment_destination_country);
-- Duplicate detection
CREATE UNIQUE INDEX idx_ve_tx_hash_unique ON verification_events(org_id, payment_tx_hash, payment_chain)
  WHERE payment_tx_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- evidence_bundles — write-once, immutable after insert
-- ---------------------------------------------------------------------------

CREATE TABLE evidence_bundles (
  -- Identity
  evidence_bundle_id    TEXT PRIMARY KEY,
  event_id              TEXT NOT NULL REFERENCES verification_events(event_id),
  org_id                TEXT NOT NULL REFERENCES orgs(org_id),

  -- Intent Hash (patent-protected: US 12,463,819 B1)
  intent_hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
  intent_hash_value     TEXT NOT NULL,
  intent_hash_canonical_fields TEXT[] NOT NULL,

  -- Authorization Proof
  authorization_type    TEXT NOT NULL,
  authorized            BOOLEAN NOT NULL,
  authorizer            TEXT NOT NULL,
  authorization_scope   TEXT,
  evaluated_at          TIMESTAMPTZ NOT NULL,

  -- Policy Trace (full detail)
  policy_trace          JSONB NOT NULL,

  -- Screening Snapshot
  screening_provider    TEXT NOT NULL,
  screening_result      TEXT NOT NULL,
  screened_entity       TEXT NOT NULL,
  screening_screened_at TIMESTAMPTZ NOT NULL,

  -- Execution Proof
  exec_tx_hash          TEXT,
  exec_chain            TEXT NOT NULL,
  exec_observed_onchain BOOLEAN NOT NULL DEFAULT false,
  exec_first_seen_at    TIMESTAMPTZ,
  exec_confirmation_status TEXT,

  -- Tamper Evidence (server-computed from digest chain)
  record_hash           TEXT NOT NULL,
  previous_record_hash  TEXT NOT NULL,
  chain_index           BIGINT NOT NULL,

  -- Render summary (pre-computed for fast drawer load)
  render_headline       TEXT NOT NULL,
  render_subheadline    TEXT NOT NULL,
  render_risk_label     TEXT NOT NULL,

  -- Immutability enforcement
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eb_event     ON evidence_bundles(event_id);
CREATE INDEX idx_eb_org       ON evidence_bundles(org_id);
CREATE INDEX idx_eb_chain_idx ON evidence_bundles(org_id, chain_index);

-- ---------------------------------------------------------------------------
-- digest_chain_state — rolling chain head per org (server-side only)
-- ---------------------------------------------------------------------------

CREATE TABLE digest_chain_state (
  org_id              TEXT PRIMARY KEY REFERENCES orgs(org_id),
  terminal_digest     TEXT NOT NULL,
  chain_length        BIGINT NOT NULL DEFAULT 0,
  last_event_id       TEXT,
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- audit_exports
-- ---------------------------------------------------------------------------

CREATE TABLE audit_exports (
  export_id         TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES orgs(org_id),
  requested_by      TEXT NOT NULL,
  format            TEXT NOT NULL,
  date_range_from   TIMESTAMPTZ NOT NULL,
  date_range_to     TIMESTAMPTZ NOT NULL,
  event_count       INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending',
  download_url      TEXT,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_exports_org ON audit_exports(org_id, created_at DESC);
