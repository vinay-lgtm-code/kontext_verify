// ============================================================================
// Kontext SDK - Feature Flag Manager (Firestore REST API)
// ============================================================================

import type {
  FeatureFlag,
  FeatureFlagConfig,
  FlagTargeting,
  FlagPlanTargeting,
  FlagScope,
  Environment,
} from './types.js';

/** Cached flag entry with expiry timestamp */
interface CachedFlag {
  flag: FeatureFlag;
  expiresAt: number;
}

/** Firestore REST API document shape */
interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime: string;
  updateTime: string;
}

/** Firestore value types we handle */
interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  mapValue?: { fields: Record<string, FirestoreValue> };
}

/** Firestore list response */
interface FirestoreListResponse {
  documents?: FirestoreDocument[];
}

const DEFAULT_CACHE_TTL_MS = 300_000; // 5 minutes

/**
 * Feature flag manager backed by Firestore REST API.
 *
 * Uses a stale-while-revalidate caching strategy:
 * - `isEnabled()` is synchronous — reads from cache, never blocks
 * - Background refresh fires when cache entries expire on read
 * - Falls back to `defaultValue` (false) when flag is unknown
 */
export class FeatureFlagManager {
  private readonly config: FeatureFlagConfig;
  private readonly cacheTtlMs: number;
  private readonly defaultValue: boolean;
  private readonly cache = new Map<string, CachedFlag>();
  private refreshInFlight = false;

  constructor(config: FeatureFlagConfig) {
    this.config = config;
    this.cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.defaultValue = config.defaultValue ?? false;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Initialize the manager by fetching all flags from Firestore.
   * Call this once at startup to warm the cache.
   */
  async init(): Promise<void> {
    await this.refresh();
  }

  /**
   * Check if a flag is enabled for the given environment and plan.
   * Always synchronous — reads from cache.
   * Triggers a background refresh when the cached entry is stale.
   */
  isEnabled(
    flagName: string,
    environment?: Environment,
    plan?: 'free' | 'pro' | 'enterprise',
  ): boolean {
    const env = environment ?? this.config.environment;
    const tier = plan ?? this.config.plan;

    const entry = this.cache.get(flagName);
    if (!entry) {
      this.triggerBackgroundRefresh();
      return this.defaultValue;
    }

    // Stale-while-revalidate: return cached value but refresh in background
    if (Date.now() > entry.expiresAt) {
      this.triggerBackgroundRefresh();
    }

    const envTargeting = entry.flag.targeting[env];
    if (!envTargeting) return this.defaultValue;

    return envTargeting[tier] ?? this.defaultValue;
  }

  /**
   * Get a single flag by name (from cache).
   */
  getFlag(flagName: string): FeatureFlag | undefined {
    return this.cache.get(flagName)?.flag;
  }

  /**
   * Get all cached flags.
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.cache.values()).map((e) => e.flag);
  }

  /**
   * Force-refresh all flags from Firestore.
   */
  async refresh(): Promise<void> {
    try {
      const docs = await this.fetchAllFromFirestore();
      const now = Date.now();

      for (const doc of docs) {
        const flag = parseFirestoreDocument(doc);
        if (!flag) continue;

        // Filter by scope if configured
        if (this.config.scope && flag.scope !== 'all' && flag.scope !== this.config.scope) {
          continue;
        }

        this.cache.set(flag.name, {
          flag,
          expiresAt: now + this.cacheTtlMs,
        });
      }
    } catch {
      // Silent failure — stale cache is better than no cache
    }
  }

  // --------------------------------------------------------------------------
  // Firestore REST API
  // --------------------------------------------------------------------------

  private get firestoreBaseUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${this.config.gcpProjectId}/databases/(default)/documents`;
  }

  private async fetchAllFromFirestore(): Promise<FirestoreDocument[]> {
    const url = `${this.firestoreBaseUrl}/feature-flags`;
    const headers: Record<string, string> = {};

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Firestore fetch failed: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as FirestoreListResponse;
    return body.documents ?? [];
  }

  async fetchOneFromFirestore(flagName: string): Promise<FirestoreDocument | null> {
    const url = `${this.firestoreBaseUrl}/feature-flags/${flagName}`;
    const headers: Record<string, string> = {};

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Firestore fetch failed: ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as FirestoreDocument;
  }

  // --------------------------------------------------------------------------
  // Background Refresh
  // --------------------------------------------------------------------------

  private triggerBackgroundRefresh(): void {
    if (this.refreshInFlight) return;
    this.refreshInFlight = true;
    this.refresh().finally(() => {
      this.refreshInFlight = false;
    });
  }
}

// ============================================================================
// Firestore Document Parsing
// ============================================================================

/**
 * Parse a Firestore REST API document into a flat FeatureFlag.
 * Returns null if the document is malformed.
 */
export function parseFirestoreDocument(doc: FirestoreDocument): FeatureFlag | null {
  try {
    const fields = doc.fields;
    const name = extractDocumentId(doc.name);

    const description = fields['description']?.stringValue ?? '';
    const scope = (fields['scope']?.stringValue ?? 'all') as FlagScope;
    const createdBy = fields['createdBy']?.stringValue ?? '';
    const createdAt = fields['createdAt']?.stringValue ?? doc.createTime;
    const updatedAt = fields['updatedAt']?.stringValue ?? doc.updateTime;

    const targetingMap = fields['targeting']?.mapValue?.fields;
    if (!targetingMap) return null;

    const targeting = parseTargeting(targetingMap);
    if (!targeting) return null;

    return { name, description, scope, targeting, createdAt, updatedAt, createdBy };
  } catch {
    return null;
  }
}

function parseTargeting(
  fields: Record<string, FirestoreValue>,
): FlagTargeting | null {
  const dev = parsePlanTargeting(fields['development']?.mapValue?.fields);
  const staging = parsePlanTargeting(fields['staging']?.mapValue?.fields);
  const prod = parsePlanTargeting(fields['production']?.mapValue?.fields);

  if (!dev || !staging || !prod) return null;

  return { development: dev, staging, production: prod };
}

function parsePlanTargeting(
  fields: Record<string, FirestoreValue> | undefined,
): FlagPlanTargeting | null {
  if (!fields) return null;
  return {
    free: fields['free']?.booleanValue ?? false,
    pro: fields['pro']?.booleanValue ?? false,
    enterprise: fields['enterprise']?.booleanValue ?? false,
  };
}

/** Extract the document ID from a Firestore resource name */
function extractDocumentId(resourceName: string): string {
  const parts = resourceName.split('/');
  return parts[parts.length - 1] ?? resourceName;
}
