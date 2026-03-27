-- ============================================================================
-- Migration 006: Screening metadata columns on evidence_bundles
-- ============================================================================
-- Adds columns to capture which sanctions lists were checked, the version
-- of the screening index used, matched entity details, and screening latency.
-- These columns are populated at ingest time by the ScreeningEngine.

ALTER TABLE evidence_bundles
  ADD COLUMN IF NOT EXISTS screening_lists_checked TEXT[],
  ADD COLUMN IF NOT EXISTS screening_list_version  TEXT,
  ADD COLUMN IF NOT EXISTS screening_entity_id     TEXT,
  ADD COLUMN IF NOT EXISTS screening_entity_name   TEXT,
  ADD COLUMN IF NOT EXISTS screening_duration_ms   REAL;
