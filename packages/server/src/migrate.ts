// ============================================================================
// Kontext Server — Migration Runner
// ============================================================================
// Reads SQL files from packages/server/migrations/ and applies them in order.
// Tracks applied migrations in a `migrations` table.

import { getPool } from './db.js';
import * as fs from 'fs';
import * as path from 'path';

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log('[migrate] No DATABASE_URL configured — skipping migrations');
    return;
  }

  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Find migration files
    const migrationsDir = path.resolve(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[migrate] No migrations directory found — skipping');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[migrate] No migration files found');
      return;
    }

    // Get already-applied migrations
    const { rows } = await client.query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
    const applied = new Set(rows.map((r) => r.name));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`[migrate] Applying ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count++;
        console.log(`[migrate] Applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] Failed to apply ${file}:`, err);
        throw err;
      }
    }

    if (count === 0) {
      console.log('[migrate] All migrations already applied');
    } else {
      console.log(`[migrate] Applied ${count} migration(s)`);
    }
  } finally {
    client.release();
  }
}
