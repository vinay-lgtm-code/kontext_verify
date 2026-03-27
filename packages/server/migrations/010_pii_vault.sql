-- ============================================================================
-- Migration 010: PII Vault + GDPR Erasure
-- ============================================================================
-- Stores PII in an encrypted vault with pseudonym tokens. Supports GDPR
-- right-to-erasure by destroying the vault mapping while preserving digest
-- chain integrity (chain uses pseudonymized values).

CREATE TABLE pii_vault (
  vault_id          TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL,
  subject_id        TEXT NOT NULL,
  subject_type      TEXT NOT NULL CHECK (subject_type IN ('individual', 'entity', 'agent')),
  pii_fields        JSONB NOT NULL,
  pseudonym_token   TEXT NOT NULL UNIQUE,
  encryption_key_id TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  erased_at         TIMESTAMPTZ,
  UNIQUE (org_id, subject_id)
);

CREATE TABLE erasure_requests (
  request_id    TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  subject_id    TEXT NOT NULL,
  requested_by  TEXT NOT NULL,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  affected_events INTEGER,
  error         TEXT
);

CREATE INDEX idx_pii_vault_org_subject ON pii_vault(org_id, subject_id);
CREATE INDEX idx_pii_vault_pseudonym ON pii_vault(pseudonym_token);
CREATE INDEX idx_erasure_org ON erasure_requests(org_id);
