-- ============================================================================
-- Migration 011: AI Evidence Narratives
-- ============================================================================

CREATE TABLE narratives (
  narrative_id          TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL,
  event_id              TEXT NOT NULL,
  evidence_bundle_id    TEXT NOT NULL,
  template              TEXT NOT NULL CHECK (template IN ('occ','cfpb','state_banking','mica','internal_audit')),
  sections              JSONB NOT NULL,
  markdown              TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating','draft','reviewed','approved','failed')),
  analyst_notes         TEXT,
  reviewed_by           TEXT,
  reviewed_at           TIMESTAMPTZ,
  review_decision       TEXT CHECK (review_decision IN ('approved','changes_requested')),
  generated_by          TEXT NOT NULL,
  llm_provider          TEXT,
  llm_model             TEXT,
  llm_tokens_used       INTEGER,
  generation_time_ms    INTEGER,
  digest_reference      TEXT NOT NULL,
  chain_index_reference INTEGER NOT NULL,
  bulk_id               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ
);

CREATE TABLE narrative_bulk_jobs (
  bulk_id           TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL,
  template          TEXT NOT NULL,
  filters           JSONB NOT NULL,
  total_events      INTEGER NOT NULL,
  completed_events  INTEGER NOT NULL DEFAULT 0,
  failed_events     INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','complete','failed')),
  generated_by      TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_narratives_event_id ON narratives(event_id);
CREATE INDEX idx_narratives_org_created ON narratives(org_id, created_at DESC);
CREATE INDEX idx_narratives_bulk_id ON narratives(bulk_id) WHERE bulk_id IS NOT NULL;
CREATE INDEX idx_bulk_jobs_org ON narrative_bulk_jobs(org_id, created_at DESC);
