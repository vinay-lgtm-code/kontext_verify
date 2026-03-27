-- ============================================================================
-- Kontext v1 — Export Templates: Examiner-Ready Evidence Export Engine
-- ============================================================================

ALTER TABLE audit_exports
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'examiner',
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS gcs_path TEXT,
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS progress_pct SMALLINT DEFAULT 0;
