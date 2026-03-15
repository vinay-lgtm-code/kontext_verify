// ============================================================================
// Kontext Server — Postgres Connection Pool
// ============================================================================
// Singleton Pool from `pg`. Reads DATABASE_URL or individual PG* env vars.
// Returns null if no database is configured (graceful degradation).

import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  if (pool) return pool;

  const connectionString =
    process.env['DATABASE_URL'] ??
    (process.env['PGHOST']
      ? undefined
      : 'postgresql://kontext:kontext_dev@localhost:5432/kontext');

  const ssl =
    process.env['NODE_ENV'] === 'production'
      ? { rejectUnauthorized: false } // CloudSQL uses self-signed certs
      : undefined;

  try {
    pool = new Pool({
      connectionString,
      max: 10,
      ssl,
      // Idle timeout: release connections after 30s of inactivity
      idleTimeoutMillis: 30_000,
      // Connection timeout: fail fast if Postgres is unreachable
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      console.error('[Kontext DB] Unexpected pool error:', err.message);
    });

    return pool;
  } catch {
    console.warn('[Kontext DB] Failed to create connection pool');
    return null;
  }
}

/**
 * Middleware-style guard: returns 503 if no database is configured.
 */
export function requireDb(): pg.Pool {
  const p = getPool();
  if (!p) {
    throw Object.assign(new Error('Database not configured'), { status: 503 });
  }
  return p;
}
