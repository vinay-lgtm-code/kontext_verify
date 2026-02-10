// ============================================================================
// Kontext Server - Feature Flag Service (Firestore + GCP Metadata Auth)
// ============================================================================

/** Plan-based targeting for a single environment */
interface FlagPlanTargeting {
  free: boolean;
  pro: boolean;
  enterprise: boolean;
}

/** Full targeting across all environments */
interface FlagTargeting {
  development: FlagPlanTargeting;
  staging: FlagPlanTargeting;
  production: FlagPlanTargeting;
}

type FlagScope = 'sdk' | 'server' | 'website' | 'all';
type Environment = 'development' | 'staging' | 'production';

/** A feature flag document */
export interface FeatureFlag {
  name: string;
  description: string;
  scope: FlagScope;
  targeting: FlagTargeting;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Firestore REST API value shape */
interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  mapValue?: { fields: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime: string;
  updateTime: string;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
}

/** Cached flag with expiry */
interface CachedFlag {
  flag: FeatureFlag;
  expiresAt: number;
}

const DEFAULT_SERVER_CACHE_TTL_MS = 60_000; // 1 minute
const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

/**
 * Server-side feature flag manager.
 * Uses GCP metadata server for auth on Cloud Run, falls back to env var locally.
 */
export class ServerFeatureFlags {
  private readonly gcpProjectId: string;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, CachedFlag>();
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private refreshInFlight = false;

  constructor(gcpProjectId: string, cacheTtlMs?: number) {
    this.gcpProjectId = gcpProjectId;
    this.cacheTtlMs = cacheTtlMs ?? DEFAULT_SERVER_CACHE_TTL_MS;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Warm the cache at startup */
  async init(): Promise<void> {
    await this.refresh();
  }

  /**
   * Synchronous check — reads from cache. Returns false if unknown.
   * Triggers background refresh when stale.
   */
  isEnabled(
    flagName: string,
    environment: Environment,
    plan: 'free' | 'pro' | 'enterprise',
  ): boolean {
    const entry = this.cache.get(flagName);
    if (!entry) {
      this.triggerBackgroundRefresh();
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.triggerBackgroundRefresh();
    }

    const envTargeting = entry.flag.targeting[environment];
    if (!envTargeting) return false;

    return envTargeting[plan] ?? false;
  }

  /** Get a single flag from cache */
  getFlag(flagName: string): FeatureFlag | undefined {
    return this.cache.get(flagName)?.flag;
  }

  /** Get all cached flags, optionally filtered by scope */
  getAllFlags(scope?: FlagScope): FeatureFlag[] {
    const flags = Array.from(this.cache.values()).map((e) => e.flag);
    if (!scope) return flags;
    return flags.filter((f) => f.scope === 'all' || f.scope === scope);
  }

  /** Force-refresh from Firestore */
  async refresh(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.gcpProjectId}/databases/(default)/documents/feature-flags`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Firestore fetch failed: ${res.status}`);
      }

      const body = (await res.json()) as FirestoreListResponse;
      const now = Date.now();

      for (const doc of body.documents ?? []) {
        const flag = parseFirestoreDocument(doc);
        if (!flag) continue;
        this.cache.set(flag.name, { flag, expiresAt: now + this.cacheTtlMs });
      }
    } catch {
      // Silent — serve stale cache
    }
  }

  // --------------------------------------------------------------------------
  // GCP Auth
  // --------------------------------------------------------------------------

  private async getAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Try env var first (local development)
    const envToken = process.env['GOOGLE_ACCESS_TOKEN'];
    if (envToken) {
      this.accessToken = envToken;
      this.tokenExpiresAt = Date.now() + 3_600_000; // assume 1 hour
      return envToken;
    }

    // Try GCP metadata server (Cloud Run / GCE / GKE)
    try {
      const res = await fetch(METADATA_TOKEN_URL, {
        headers: { 'Metadata-Flavor': 'Google' },
      });

      if (!res.ok) return null;

      const data = (await res.json()) as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch {
      return null;
    }
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
// Firestore Document Parsing (duplicated here to avoid cross-package import)
// ============================================================================

function parseFirestoreDocument(doc: FirestoreDocument): FeatureFlag | null {
  try {
    const fields = doc.fields;
    const parts = doc.name.split('/');
    const name = parts[parts.length - 1];

    const description = fields['description']?.stringValue ?? '';
    const scope = (fields['scope']?.stringValue ?? 'all') as FlagScope;
    const createdBy = fields['createdBy']?.stringValue ?? '';
    const createdAt = fields['createdAt']?.stringValue ?? doc.createTime;
    const updatedAt = fields['updatedAt']?.stringValue ?? doc.updateTime;

    const targetingMap = fields['targeting']?.mapValue?.fields;
    if (!targetingMap) return null;

    const dev = parsePlanTargeting(targetingMap['development']?.mapValue?.fields);
    const staging = parsePlanTargeting(targetingMap['staging']?.mapValue?.fields);
    const prod = parsePlanTargeting(targetingMap['production']?.mapValue?.fields);

    if (!dev || !staging || !prod) return null;

    return {
      name,
      description,
      scope,
      targeting: { development: dev, staging, production: prod },
      createdAt,
      updatedAt,
      createdBy,
    };
  } catch {
    return null;
  }
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
