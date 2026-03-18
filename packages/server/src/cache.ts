// ============================================================================
// Kontext Server — Redis Cache (Cloud Memorystore)
// ============================================================================
// Graceful degradation: returns null if REDIS_URL is not configured.
// Modeled after db.ts (getPool pattern).

import { Redis } from 'ioredis';

let redis: Redis | null = null;
let connectAttempted = false;

export function getRedis(): Redis | null {
  if (connectAttempted) return redis;
  connectAttempted = true;

  const url = process.env['REDIS_URL'];
  if (!url) {
    console.warn('[Kontext Cache] REDIS_URL not set — caching disabled (keystore will use DB fallback)');
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 3_000,
      lazyConnect: false,
      enableOfflineQueue: false,
    });

    redis.on('error', (err: Error) => {
      console.error('[Kontext Cache] Redis error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Kontext Cache] Connected to Redis');
    });

    return redis;
  } catch {
    console.warn('[Kontext Cache] Failed to create Redis client');
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, 'EX', ttlSeconds);
  } catch {
    // Cache write failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch {
    // Cache delete failure is non-fatal
  }
}
