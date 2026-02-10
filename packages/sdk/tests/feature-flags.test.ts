// ============================================================================
// Feature Flag Manager Tests (mock fetch)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureFlagManager, parseFirestoreDocument } from '../src/feature-flags.js';
import type { FeatureFlagConfig } from '../src/types.js';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeFirestoreDocument(name: string, overrides?: Record<string, unknown>) {
  return {
    name: `projects/test-project/databases/(default)/documents/feature-flags/${name}`,
    fields: {
      description: { stringValue: `Test flag: ${name}` },
      scope: { stringValue: 'all' },
      createdBy: { stringValue: 'test@test.com' },
      createdAt: { stringValue: '2025-01-01T00:00:00Z' },
      updatedAt: { stringValue: '2025-01-01T00:00:00Z' },
      targeting: {
        mapValue: {
          fields: {
            development: {
              mapValue: {
                fields: {
                  free: { booleanValue: true },
                  pro: { booleanValue: true },
                  enterprise: { booleanValue: true },
                },
              },
            },
            staging: {
              mapValue: {
                fields: {
                  free: { booleanValue: false },
                  pro: { booleanValue: true },
                  enterprise: { booleanValue: true },
                },
              },
            },
            production: {
              mapValue: {
                fields: {
                  free: { booleanValue: false },
                  pro: { booleanValue: false },
                  enterprise: { booleanValue: true },
                },
              },
            },
          },
        },
      },
      ...overrides,
    },
    createTime: '2025-01-01T00:00:00Z',
    updateTime: '2025-01-01T00:00:00Z',
  };
}

function mockFetchSuccess(documents: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ documents }),
  });
}

function defaultConfig(overrides?: Partial<FeatureFlagConfig>): FeatureFlagConfig {
  return {
    gcpProjectId: 'test-project',
    environment: 'development',
    plan: 'free',
    cacheTtlMs: 60_000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseFirestoreDocument', () => {
  it('should parse a well-formed Firestore document', () => {
    const doc = makeFirestoreDocument('test-flag');
    const flag = parseFirestoreDocument(doc);

    expect(flag).not.toBeNull();
    expect(flag!.name).toBe('test-flag');
    expect(flag!.description).toBe('Test flag: test-flag');
    expect(flag!.scope).toBe('all');
    expect(flag!.targeting.development.free).toBe(true);
    expect(flag!.targeting.staging.free).toBe(false);
    expect(flag!.targeting.staging.pro).toBe(true);
    expect(flag!.targeting.production.enterprise).toBe(true);
    expect(flag!.targeting.production.free).toBe(false);
  });

  it('should return null for a document without targeting', () => {
    const doc = {
      name: 'projects/p/databases/(default)/documents/feature-flags/broken',
      fields: {
        description: { stringValue: 'No targeting' },
      },
      createTime: '2025-01-01T00:00:00Z',
      updateTime: '2025-01-01T00:00:00Z',
    };
    expect(parseFirestoreDocument(doc)).toBeNull();
  });

  it('should default missing booleans to false', () => {
    const doc = makeFirestoreDocument('partial-flag');
    // Remove the 'free' field from production targeting
    delete (doc.fields.targeting as any).mapValue.fields.production.mapValue.fields.free;
    const flag = parseFirestoreDocument(doc);
    expect(flag).not.toBeNull();
    expect(flag!.targeting.production.free).toBe(false);
  });
});

describe('FeatureFlagManager', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should init and populate cache from Firestore', async () => {
    const docs = [
      makeFirestoreDocument('flag-a'),
      makeFirestoreDocument('flag-b'),
    ];
    globalThis.fetch = mockFetchSuccess(docs) as any;

    const manager = new FeatureFlagManager(defaultConfig());
    await manager.init();

    expect(manager.getAllFlags()).toHaveLength(2);
    expect(manager.getFlag('flag-a')).toBeDefined();
    expect(manager.getFlag('flag-b')).toBeDefined();
  });

  it('isEnabled should return true for matching env+plan', async () => {
    globalThis.fetch = mockFetchSuccess([makeFirestoreDocument('my-flag')]) as any;

    const manager = new FeatureFlagManager(defaultConfig({
      environment: 'development',
      plan: 'free',
    }));
    await manager.init();

    expect(manager.isEnabled('my-flag')).toBe(true);
  });

  it('isEnabled should return false for non-matching env+plan', async () => {
    globalThis.fetch = mockFetchSuccess([makeFirestoreDocument('my-flag')]) as any;

    const manager = new FeatureFlagManager(defaultConfig({
      environment: 'production',
      plan: 'free',
    }));
    await manager.init();

    expect(manager.isEnabled('my-flag')).toBe(false);
  });

  it('isEnabled should allow overriding env and plan', async () => {
    globalThis.fetch = mockFetchSuccess([makeFirestoreDocument('my-flag')]) as any;

    const manager = new FeatureFlagManager(defaultConfig({
      environment: 'development',
      plan: 'free',
    }));
    await manager.init();

    // Override to production + enterprise
    expect(manager.isEnabled('my-flag', 'production', 'enterprise')).toBe(true);
    expect(manager.isEnabled('my-flag', 'production', 'free')).toBe(false);
  });

  it('isEnabled should return defaultValue for unknown flag', async () => {
    globalThis.fetch = mockFetchSuccess([]) as any;

    const manager = new FeatureFlagManager(defaultConfig({ defaultValue: false }));
    await manager.init();

    expect(manager.isEnabled('nonexistent')).toBe(false);
  });

  it('isEnabled should return custom defaultValue', async () => {
    globalThis.fetch = mockFetchSuccess([]) as any;

    const manager = new FeatureFlagManager(defaultConfig({ defaultValue: true }));
    await manager.init();

    expect(manager.isEnabled('nonexistent')).toBe(true);
  });

  it('should include access token in header when configured', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ documents: [] }),
    });
    globalThis.fetch = mockFetch as any;

    const manager = new FeatureFlagManager(defaultConfig({
      accessToken: 'ya29.test-token',
    }));
    await manager.init();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('firestore.googleapis.com'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer ya29.test-token' },
      }),
    );
  });

  it('should filter flags by scope when configured', async () => {
    const sdkFlag = makeFirestoreDocument('sdk-only');
    (sdkFlag.fields.scope as any).stringValue = 'sdk';

    const serverFlag = makeFirestoreDocument('server-only');
    (serverFlag.fields.scope as any).stringValue = 'server';

    const allFlag = makeFirestoreDocument('global-flag');
    // scope = 'all' (default)

    globalThis.fetch = mockFetchSuccess([sdkFlag, serverFlag, allFlag]) as any;

    const manager = new FeatureFlagManager(defaultConfig({ scope: 'sdk' }));
    await manager.init();

    const flags = manager.getAllFlags();
    expect(flags).toHaveLength(2); // sdk-only + global-flag (all)
    expect(flags.map((f) => f.name).sort()).toEqual(['global-flag', 'sdk-only']);
  });

  it('should handle fetch failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error')) as any;

    const manager = new FeatureFlagManager(defaultConfig());
    // Should not throw
    await manager.init();

    expect(manager.getAllFlags()).toHaveLength(0);
    expect(manager.isEnabled('any-flag')).toBe(false);
  });

  it('should trigger background refresh for stale entries', async () => {
    const docs = [makeFirestoreDocument('stale-flag')];
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ documents: docs }),
      });
    }) as any;

    const manager = new FeatureFlagManager(defaultConfig({ cacheTtlMs: 1 }));
    await manager.init();
    expect(callCount).toBe(1);

    // Wait for cache to expire
    await new Promise((r) => setTimeout(r, 10));

    // This read should trigger a background refresh
    manager.isEnabled('stale-flag');

    // Let the background refresh complete
    await new Promise((r) => setTimeout(r, 50));
    expect(callCount).toBeGreaterThan(1);
  });
});
