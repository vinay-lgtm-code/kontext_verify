// ============================================================================
// Server Feature Flags Tests (mock fetch)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServerFeatureFlags } from '../src/feature-flags.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeFirestoreDocument(name: string) {
  return {
    name: `projects/test-project/databases/(default)/documents/feature-flags/${name}`,
    fields: {
      description: { stringValue: `Flag: ${name}` },
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
                  startup: { booleanValue: true },
                  growth: { booleanValue: true },
                  enterprise: { booleanValue: true },
                },
              },
            },
            staging: {
              mapValue: {
                fields: {
                  startup: { booleanValue: false },
                  growth: { booleanValue: true },
                  enterprise: { booleanValue: true },
                },
              },
            },
            production: {
              mapValue: {
                fields: {
                  startup: { booleanValue: false },
                  growth: { booleanValue: false },
                  enterprise: { booleanValue: true },
                },
              },
            },
          },
        },
      },
    },
    createTime: '2025-01-01T00:00:00Z',
    updateTime: '2025-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServerFeatureFlags', () => {
  let originalFetch: typeof globalThis.fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalEnv = process.env['GOOGLE_ACCESS_TOKEN'];
    // Provide a token so it skips the metadata server call
    process.env['GOOGLE_ACCESS_TOKEN'] = 'test-token';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env['GOOGLE_ACCESS_TOKEN'];
    } else {
      process.env['GOOGLE_ACCESS_TOKEN'] = originalEnv;
    }
  });

  it('should init and populate cache', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        documents: [makeFirestoreDocument('test-flag')],
      }),
    }) as any;

    const flags = new ServerFeatureFlags('test-project');
    await flags.init();

    expect(flags.getAllFlags()).toHaveLength(1);
    expect(flags.getFlag('test-flag')).toBeDefined();
  });

  it('isEnabled should return correct values for env+plan combos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        documents: [makeFirestoreDocument('gated-feature')],
      }),
    }) as any;

    const flags = new ServerFeatureFlags('test-project');
    await flags.init();

    // development — all plans enabled
    expect(flags.isEnabled('gated-feature', 'development', 'startup')).toBe(true);
    expect(flags.isEnabled('gated-feature', 'development', 'growth')).toBe(true);
    expect(flags.isEnabled('gated-feature', 'development', 'enterprise')).toBe(true);

    // staging — growth + enterprise only
    expect(flags.isEnabled('gated-feature', 'staging', 'startup')).toBe(false);
    expect(flags.isEnabled('gated-feature', 'staging', 'growth')).toBe(true);

    // production — enterprise only
    expect(flags.isEnabled('gated-feature', 'production', 'startup')).toBe(false);
    expect(flags.isEnabled('gated-feature', 'production', 'growth')).toBe(false);
    expect(flags.isEnabled('gated-feature', 'production', 'enterprise')).toBe(true);
  });

  it('should return false for unknown flags', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ documents: [] }),
    }) as any;

    const flags = new ServerFeatureFlags('test-project');
    await flags.init();

    expect(flags.isEnabled('nonexistent', 'development', 'startup')).toBe(false);
  });

  it('should filter flags by scope', async () => {
    const serverDoc = makeFirestoreDocument('server-flag');
    (serverDoc.fields.scope as any).stringValue = 'server';

    const websiteDoc = makeFirestoreDocument('website-flag');
    (websiteDoc.fields.scope as any).stringValue = 'website';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        documents: [serverDoc, websiteDoc],
      }),
    }) as any;

    const flags = new ServerFeatureFlags('test-project');
    await flags.init();

    const serverFlags = flags.getAllFlags('server');
    expect(serverFlags).toHaveLength(1);
    expect(serverFlags[0].name).toBe('server-flag');

    const websiteFlags = flags.getAllFlags('website');
    expect(websiteFlags).toHaveLength(1);
    expect(websiteFlags[0].name).toBe('website-flag');

    // No scope filter — get all
    expect(flags.getAllFlags()).toHaveLength(2);
  });

  it('should handle Firestore errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error')) as any;

    const flags = new ServerFeatureFlags('test-project');
    await flags.init(); // should not throw

    expect(flags.getAllFlags()).toHaveLength(0);
  });

  it('should send Authorization header with access token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ documents: [] }),
    });
    globalThis.fetch = mockFetch as any;

    const flags = new ServerFeatureFlags('test-project');
    await flags.init();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('firestore.googleapis.com'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    );
  });
});
