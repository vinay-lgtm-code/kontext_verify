-- 007_enforcement_mode.sql
-- Adds enforcement mode support: advisory (default), blocking, human_review

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS enforcement_mode TEXT NOT NULL DEFAULT 'advisory'
  CHECK (enforcement_mode IN ('advisory', 'blocking', 'human_review'));

ALTER TABLE verification_events ADD COLUMN IF NOT EXISTS enforcement_mode TEXT NOT NULL DEFAULT 'advisory';

ALTER TABLE evidence_bundles ADD COLUMN IF NOT EXISTS enforcement_mode TEXT;
