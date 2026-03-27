-- ============================================================================
-- 008_approvals.sql — Approval chain workflow for verification events
-- ============================================================================

CREATE TABLE approvals (
  approval_id   TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL,
  org_id        TEXT NOT NULL,
  step_index    SMALLINT NOT NULL DEFAULT 0,
  total_steps   SMALLINT NOT NULL DEFAULT 1,
  approver_id   TEXT,
  approver_role TEXT,
  decision      TEXT CHECK (decision IN ('pending', 'approved', 'rejected')),
  reason        TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, step_index)
);

CREATE INDEX idx_approvals_org_pending ON approvals(org_id) WHERE decision = 'pending';
CREATE INDEX idx_approvals_event ON approvals(event_id);

ALTER TABLE verification_events ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE evidence_bundles ADD COLUMN IF NOT EXISTS approval_chain JSONB;
