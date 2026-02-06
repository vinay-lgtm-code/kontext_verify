// ============================================================================
// Kontext SDK - Pluggable Storage Adapters
// ============================================================================
// Provides a StorageAdapter interface and built-in implementations for
// persistence. The MemoryStorage adapter preserves existing in-memory
// behavior, while FileStorage writes JSON files to disk.
// Users can implement their own adapters (Redis, Postgres, etc.) by
// conforming to the StorageAdapter interface.

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// StorageAdapter Interface
// ============================================================================

/**
 * Interface for pluggable storage backends.
 * Implement this to persist Kontext data to any backend (Redis, Postgres,
 * Cloud Firestore, S3, etc.).
 *
 * @example
 * ```typescript
 * class RedisStorage implements StorageAdapter {
 *   async save(key: string, data: any): Promise<void> {
 *     await redis.set(key, JSON.stringify(data));
 *   }
 *   async load(key: string): Promise<any | null> {
 *     const raw = await redis.get(key);
 *     return raw ? JSON.parse(raw) : null;
 *   }
 *   async delete(key: string): Promise<void> {
 *     await redis.del(key);
 *   }
 *   async list(prefix?: string): Promise<string[]> {
 *     return redis.keys(prefix ? `${prefix}*` : '*');
 *   }
 * }
 * ```
 */
export interface StorageAdapter {
  /** Persist data under the given key. */
  save(key: string, data: any): Promise<void>;
  /** Load data for the given key, returning null if not found. */
  load(key: string): Promise<any | null>;
  /** Delete data for the given key. */
  delete(key: string): Promise<void>;
  /** List all keys, optionally filtered by prefix. */
  list(prefix?: string): Promise<string[]>;
}

// ============================================================================
// MemoryStorage
// ============================================================================

/**
 * In-memory storage adapter. Data is lost when the process exits.
 * This is the default adapter and preserves the SDK's original behavior.
 */
export class MemoryStorage implements StorageAdapter {
  private data: Map<string, any> = new Map();

  async save(key: string, data: any): Promise<void> {
    this.data.set(key, structuredClone(data));
  }

  async load(key: string): Promise<any | null> {
    const value = this.data.get(key);
    return value !== undefined ? structuredClone(value) : null;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.data.keys());
    if (!prefix) return keys;
    return keys.filter((k) => k.startsWith(prefix));
  }

  /** Clear all data. Useful for testing. */
  clear(): void {
    this.data.clear();
  }
}

// ============================================================================
// FileStorage
// ============================================================================

/**
 * File-based storage adapter. Persists each key as a separate JSON file
 * inside the configured directory.
 *
 * @example
 * ```typescript
 * const storage = new FileStorage('./kontext-data');
 * await storage.save('actions', [action1, action2]);
 * const actions = await storage.load('actions');
 * ```
 */
export class FileStorage implements StorageAdapter {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  async save(key: string, data: any): Promise<void> {
    fs.mkdirSync(this.baseDir, { recursive: true });
    const filePath = this.keyToPath(key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(key: string): Promise<any | null> {
    const filePath = this.keyToPath(key);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.keyToPath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async list(prefix?: string): Promise<string[]> {
    if (!fs.existsSync(this.baseDir)) return [];
    return this.listRecursive(this.baseDir, prefix);
  }

  /** Get the base directory path. */
  getBaseDir(): string {
    return this.baseDir;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private keyToPath(key: string): string {
    // Replace colons and slashes with OS path separators for nested keys
    const safeName = key.replace(/[<>"|?*]/g, '_');
    return path.join(this.baseDir, `${safeName}.json`);
  }

  private pathToKey(filePath: string): string {
    const relative = path.relative(this.baseDir, filePath);
    // Remove .json extension
    return relative.replace(/\.json$/, '');
  }

  private listRecursive(dir: string, prefix?: string): string[] {
    const keys: string[] = [];
    if (!fs.existsSync(dir)) return keys;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        keys.push(...this.listRecursive(fullPath, prefix));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const key = this.pathToKey(fullPath);
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    }
    return keys;
  }
}
