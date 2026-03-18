-- ============================================================================
-- Kontext v1 — Migration 005: RBAC (admin / staff-dev / staff-risk)
-- ============================================================================
-- Roles:
--   admin      — complete access
--   staff-dev  — dashboard + CLI; own initiated + assigned events only
--   staff-risk — dashboard only, no API keys; assigned events only
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Evolve org_users
-- Existing cols: user_id, org_id, email, role, permissions TEXT[], created_at
-- ---------------------------------------------------------------------------

ALTER TABLE org_users
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'active'
                                       CHECK (status IN ('invited','active','revoked')),
  ADD COLUMN IF NOT EXISTS invited_by  TEXT REFERENCES org_users(user_id),
  ADD COLUMN IF NOT EXISTS invited_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS joined_at   TIMESTAMPTZ;

-- Seed row has role='admin' — compatible with new role set.
-- Valid roles (admin, staff-dev, staff-risk) enforced at app layer.

-- ---------------------------------------------------------------------------
-- Evolve api_keys
-- Existing cols: api_key TEXT PRIMARY KEY, org_id, label, plan, active,
--               created_at, last_used_at
-- ---------------------------------------------------------------------------

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS key_hash      TEXT UNIQUE,     -- SHA-256(raw key), hex
  ADD COLUMN IF NOT EXISTS key_prefix    TEXT,            -- first 12 chars for display
  ADD COLUMN IF NOT EXISTS role          TEXT NOT NULL DEFAULT 'staff-dev',
  ADD COLUMN IF NOT EXISTS permissions   TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_rails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_id      TEXT,
  ADD COLUMN IF NOT EXISTS agent_name    TEXT,
  ADD COLUMN IF NOT EXISTS created_by    TEXT REFERENCES org_users(user_id),
  ADD COLUMN IF NOT EXISTS revoked_at    TIMESTAMPTZ;

-- staff-risk must not appear in api_keys — enforced at app layer, not DB.

-- ---------------------------------------------------------------------------
-- Evolve verification_events
-- Add ownership + assignment for data scoping
-- ---------------------------------------------------------------------------

ALTER TABLE verification_events
  ADD COLUMN IF NOT EXISTS initiated_by  TEXT REFERENCES org_users(user_id),
  ADD COLUMN IF NOT EXISTS assigned_to   TEXT REFERENCES org_users(user_id);

CREATE INDEX IF NOT EXISTS idx_ve_initiated_by ON verification_events(org_id, initiated_by);
CREATE INDEX IF NOT EXISTS idx_ve_assigned_to  ON verification_events(org_id, assigned_to);

-- ---------------------------------------------------------------------------
-- invites — single-use 72-hour invite tokens (admin sends, member redeems)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invites (
  invite_id   TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs(org_id),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','staff-dev','staff-risk')),
  token       TEXT NOT NULL UNIQUE,    -- random 32-byte hex, single-use
  invited_by  TEXT NOT NULL REFERENCES org_users(user_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '72 hours',
  accepted_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','expired'))
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_org   ON invites(org_id);

-- ---------------------------------------------------------------------------
-- sessions — JWT jti blocklist for instant revocation
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
  jti        TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES org_users(user_id),
  org_id     TEXT NOT NULL,
  issued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ---------------------------------------------------------------------------
-- feature_flags — migrated from Firestore to PostgreSQL
-- Same schema as Firestore documents; targeting stored as JSONB
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_name   TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT '',
  scope       TEXT NOT NULL DEFAULT 'all',
  targeting   JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT NOT NULL DEFAULT 'system'
);
