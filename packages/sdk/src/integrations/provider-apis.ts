// ============================================================================
// Kontext SDK - External API Screening Providers
// ============================================================================
//
// Production-ready screening providers that integrate with external compliance
// APIs for real-time address and entity risk screening.
//
// Providers:
//   - ChainalysisFreeAPIProvider: Chainalysis free-tier sanctions screening API
//   - OpenSanctionsProvider: OpenSanctions entity/PEP/sanctions screening API
//
// Both providers implement the ScreeningProvider interface and use an in-memory
// cache to reduce redundant API calls while respecting rate limits.
//
// Usage:
//   const chainalysis = new ChainalysisFreeAPIProvider({ apiKey: 'your-key' });
//   const openSanctions = new OpenSanctionsProvider({ apiKey: 'your-key' });
//
//   await chainalysis.initialize();
//   const result = await chainalysis.screenAddress({
//     address: '0x...',
//     chain: 'ethereum',
//   });
// ============================================================================

import type {
  Chain,
} from '../types.js';

import type {
  RiskCategory,
  RiskSeverity,
  RiskSignal,
  ScreeningAction,
  TransactionDirection,
  ScreeningProvider,
  ScreenAddressInput,
  ProviderScreeningResult,
} from './screening-provider.js';

// ============================================================================
// In-Memory Screening Cache
// ============================================================================

/**
 * Simple in-memory cache with per-entry TTL expiration.
 *
 * Used by both providers to avoid redundant API calls for recently-screened
 * addresses. Entries are lazily evicted on read; no background timers.
 *
 * @template T - The cached value type
 */
class ScreeningCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(private defaultTtlMs: number) {}

  /**
   * Retrieve a cached value if it exists and has not expired.
   * Expired entries are removed on access.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Store a value in the cache with an optional custom TTL.
   *
   * @param key   - Cache key
   * @param value - Value to store
   * @param ttlMs - Optional TTL override in milliseconds
   */
  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /** Return the number of entries currently in the cache (including expired). */
  size(): number {
    return this.cache.size;
  }

  /** Remove all entries from the cache. */
  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Chainalysis Free API Response Types
// ============================================================================

/** A single identification from the Chainalysis sanctions screening API */
interface ChainalysisIdentification {
  category: string;
  name: string;
  description: string;
  url: string;
}

/** Response shape from GET /address/{address} */
interface ChainalysisScreeningResponse {
  identifications: ChainalysisIdentification[];
}

// ============================================================================
// ChainalysisFreeAPIProvider
// ============================================================================

/** Configuration for the Chainalysis free-tier API provider */
interface ChainalysisFreeAPIConfig {
  /** API key obtained from Chainalysis registration */
  apiKey: string;
  /** Base URL override (defaults to public Chainalysis endpoint) */
  baseUrl?: string;
  /** Cache TTL in milliseconds (default: 15 minutes) */
  cacheTimeMs?: number;
}

/**
 * Screening provider that integrates with the Chainalysis free-tier
 * sanctions screening REST API.
 *
 * The free tier provides sanctions-only screening and is chain-agnostic
 * for address lookups. Results are cached in memory to reduce API calls.
 *
 * @see https://www.chainalysis.com/free-cryptocurrency-sanctions-screening-tools/
 *
 * @example
 * ```typescript
 * const provider = new ChainalysisFreeAPIProvider({
 *   apiKey: process.env.CHAINALYSIS_API_KEY!,
 * });
 *
 * await provider.initialize();
 *
 * const result = await provider.screenAddress({
 *   address: '0x...',
 *   chain: 'ethereum',
 * });
 *
 * if (result.matched) {
 *   console.log('Sanctions match:', result.signals);
 * }
 * ```
 */
export class ChainalysisFreeAPIProvider implements ScreeningProvider {
  readonly name = 'chainalysis-free-api';
  readonly supportedCategories: RiskCategory[] = ['SANCTIONS'];
  readonly supportedChains: Chain[] = [];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cache: ScreeningCache<ProviderScreeningResult>;
  private lastCallAt: number | null = null;
  private lastCallSuccess = false;
  private apiKeyValid = true;

  constructor(config: ChainalysisFreeAPIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://public.chainalysis.com/api/v1';
    this.cache = new ScreeningCache<ProviderScreeningResult>(
      config.cacheTimeMs ?? 15 * 60 * 1000,
    );
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Verify API key validity by making a test call against the zero address.
   * Throws if the API key is invalid or the service is unreachable.
   */
  async initialize(): Promise<void> {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    try {
      const response = await fetch(
        `${this.baseUrl}/address/${zeroAddress}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json',
          },
        },
      );

      if (response.status === 401 || response.status === 403) {
        this.apiKeyValid = false;
        throw new Error(
          `Chainalysis API key validation failed (HTTP ${response.status}). ` +
          'Verify your API key at https://www.chainalysis.com/free-cryptocurrency-sanctions-screening-tools/',
        );
      }

      if (!response.ok) {
        throw new Error(
          `Chainalysis API initialization failed with HTTP ${response.status}`,
        );
      }

      this.apiKeyValid = true;
      this.lastCallAt = Date.now();
      this.lastCallSuccess = true;
    } catch (error) {
      this.lastCallSuccess = false;
      this.lastCallAt = Date.now();

      if (error instanceof Error && error.message.includes('API key')) {
        throw error;
      }
      throw new Error(
        `Failed to initialize Chainalysis provider: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Address Screening
  // --------------------------------------------------------------------------

  /**
   * Screen an address against the Chainalysis sanctions database.
   *
   * Checks the in-memory cache first. On a cache miss, calls the Chainalysis
   * free API and maps each identification to a SEVERE-level RiskSignal.
   *
   * @param input - Address screening input
   * @returns Screening result with any detected sanctions signals
   */
  async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
    const startTime = Date.now();
    const cacheKey = input.address.toLowerCase();

    // --- Check cache ---
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        latencyMs: Date.now() - startTime,
      };
    }

    // --- Call Chainalysis API ---
    try {
      const response = await fetch(
        `${this.baseUrl}/address/${input.address}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json',
          },
        },
      );

      this.lastCallAt = Date.now();

      // Handle rate limiting
      if (response.status === 429) {
        this.lastCallSuccess = false;
        const result: ProviderScreeningResult = {
          provider: this.name,
          matched: false,
          signals: [],
          success: false,
          error: 'Rate limited',
          latencyMs: Date.now() - startTime,
          screenedAt: new Date().toISOString(),
        };
        return result;
      }

      // Handle invalid API key
      if (response.status === 401 || response.status === 403) {
        this.apiKeyValid = false;
        this.lastCallSuccess = false;
        const result: ProviderScreeningResult = {
          provider: this.name,
          matched: false,
          signals: [],
          success: false,
          error: 'Invalid API key',
          latencyMs: Date.now() - startTime,
          screenedAt: new Date().toISOString(),
        };
        return result;
      }

      if (!response.ok) {
        this.lastCallSuccess = false;
        const result: ProviderScreeningResult = {
          provider: this.name,
          matched: false,
          signals: [],
          success: false,
          error: `Chainalysis API returned HTTP ${response.status}`,
          latencyMs: Date.now() - startTime,
          screenedAt: new Date().toISOString(),
        };
        return result;
      }

      const data = (await response.json()) as ChainalysisScreeningResponse;
      this.lastCallSuccess = true;
      this.apiKeyValid = true;

      // --- Map identifications to risk signals ---
      const signals: RiskSignal[] = data.identifications.map(
        (identification): RiskSignal => ({
          provider: this.name,
          category: 'SANCTIONS' as RiskCategory,
          severity: 'SEVERE' as RiskSeverity,
          riskScore: 95,
          actions: ['DENY', 'REVIEW', 'FREEZE_WALLET'] as ScreeningAction[],
          description: `${identification.name}: ${identification.description}`,
          entityName: identification.name,
          direction: 'BOTH' as TransactionDirection,
          metadata: {
            chainalysisCategory: identification.category,
            chainalysisUrl: identification.url,
          },
        }),
      );

      const matched = data.identifications.length > 0;

      const result: ProviderScreeningResult = {
        provider: this.name,
        matched,
        signals,
        success: true,
        latencyMs: Date.now() - startTime,
        screenedAt: new Date().toISOString(),
      };

      // --- Cache the result ---
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      this.lastCallSuccess = false;
      this.lastCallAt = Date.now();

      return {
        provider: this.name,
        matched: false,
        signals: [],
        success: false,
        error: `Chainalysis API error: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - startTime,
        screenedAt: new Date().toISOString(),
      };
    }
  }

  // --------------------------------------------------------------------------
  // Health & Stats
  // --------------------------------------------------------------------------

  /**
   * Returns true if the last API call succeeded within the last 5 minutes.
   */
  async isHealthy(): Promise<boolean> {
    if (this.lastCallAt === null) return false;

    const HEALTH_WINDOW_MS = 5 * 60 * 1000;
    const withinWindow = Date.now() - this.lastCallAt < HEALTH_WINDOW_MS;

    return withinWindow && this.lastCallSuccess;
  }

  /**
   * Return operational statistics for monitoring and debugging.
   */
  getStats(): { cachedEntries: number; lastCallAt: string | null; apiKeyValid: boolean } {
    return {
      cachedEntries: this.cache.size(),
      lastCallAt: this.lastCallAt !== null
        ? new Date(this.lastCallAt).toISOString()
        : null,
      apiKeyValid: this.apiKeyValid,
    };
  }
}

// ============================================================================
// OpenSanctions API Response Types
// ============================================================================

/** A single entity result from the OpenSanctions match/search API */
interface OpenSanctionsEntityResult {
  id: string;
  caption: string;
  schema: string;
  properties: Record<string, string[]>;
  datasets: string[];
  score: number;
}

/** Response shape from POST /match/default */
interface OpenSanctionsMatchResponse {
  responses: {
    [queryId: string]: {
      results: OpenSanctionsEntityResult[];
    };
  };
}

/** Response shape from GET /search/default */
interface OpenSanctionsSearchResponse {
  results: OpenSanctionsEntityResult[];
}

// ============================================================================
// OpenSanctionsProvider
// ============================================================================

/** Configuration for the OpenSanctions API provider */
interface OpenSanctionsConfig {
  /** API key for OpenSanctions */
  apiKey: string;
  /** Base URL override (defaults to https://api.opensanctions.org) */
  baseUrl?: string;
  /** Minimum match score threshold (0-1, default: 0.7) */
  minMatchScore?: number;
  /** Cache TTL in milliseconds (default: 30 minutes) */
  cacheTimeMs?: number;
}

/**
 * Screening provider that integrates with the OpenSanctions API for
 * comprehensive entity screening across 325+ global data sources.
 *
 * Covers sanctions lists (OFAC, EU, UN), PEP databases, crime-related
 * entities, and persons of interest. Uses the CryptoWallet schema for
 * address-based matching and supports entity name search.
 *
 * @see https://www.opensanctions.org/docs/api/
 *
 * @example
 * ```typescript
 * const provider = new OpenSanctionsProvider({
 *   apiKey: process.env.OPENSANCTIONS_API_KEY!,
 *   minMatchScore: 0.8,
 * });
 *
 * await provider.initialize();
 *
 * const result = await provider.screenAddress({
 *   address: '0x...',
 *   chain: 'ethereum',
 * });
 *
 * // Entity name search
 * const entities = await provider.searchEntity('Lazarus Group');
 * ```
 */
export class OpenSanctionsProvider implements ScreeningProvider {
  readonly name = 'opensanctions';
  readonly supportedCategories: RiskCategory[] = [
    'SANCTIONS',
    'PEP',
    'TERRORIST_FINANCING',
    'ILLICIT_BEHAVIOR',
  ];
  readonly supportedChains: Chain[] = [];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly minMatchScore: number;
  private readonly cache: ScreeningCache<ProviderScreeningResult>;
  private lastCallAt: number | null = null;
  private lastCallSuccess = false;

  constructor(config: OpenSanctionsConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.opensanctions.org';
    this.minMatchScore = config.minMatchScore ?? 0.7;
    this.cache = new ScreeningCache<ProviderScreeningResult>(
      config.cacheTimeMs ?? 30 * 60 * 1000,
    );
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Test API connectivity by making a lightweight search request.
   * Throws if the API key is invalid or the service is unreachable.
   */
  async initialize(): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search/default?q=test&limit=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${this.apiKey}`,
            'Accept': 'application/json',
          },
        },
      );

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `OpenSanctions API key validation failed (HTTP ${response.status}). ` +
          'Verify your API key at https://www.opensanctions.org/account/',
        );
      }

      if (!response.ok) {
        throw new Error(
          `OpenSanctions API initialization failed with HTTP ${response.status}`,
        );
      }

      this.lastCallAt = Date.now();
      this.lastCallSuccess = true;
    } catch (error) {
      this.lastCallSuccess = false;
      this.lastCallAt = Date.now();

      if (error instanceof Error && error.message.includes('API key')) {
        throw error;
      }
      throw new Error(
        `Failed to initialize OpenSanctions provider: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Address Screening
  // --------------------------------------------------------------------------

  /**
   * Screen an address against the OpenSanctions database using the
   * CryptoWallet entity match endpoint.
   *
   * Results with a score below `minMatchScore` are filtered out. Each
   * qualifying result is mapped to a RiskSignal with category derived
   * from the entity's `topics` property.
   *
   * @param input - Address screening input
   * @returns Screening result with detected risk signals
   */
  async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
    const startTime = Date.now();
    const cacheKey = input.address.toLowerCase();

    // --- Check cache ---
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        latencyMs: Date.now() - startTime,
      };
    }

    // --- Call OpenSanctions Match API ---
    try {
      const requestBody = {
        queries: {
          q1: {
            schema: 'CryptoWallet',
            properties: {
              publicKey: [input.address],
            },
          },
        },
      };

      const response = await fetch(
        `${this.baseUrl}/match/default`,
        {
          method: 'POST',
          headers: {
            'Authorization': `ApiKey ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
      );

      this.lastCallAt = Date.now();

      if (response.status === 401 || response.status === 403) {
        this.lastCallSuccess = false;
        return {
          provider: this.name,
          matched: false,
          signals: [],
          success: false,
          error: 'Invalid API key',
          latencyMs: Date.now() - startTime,
          screenedAt: new Date().toISOString(),
        };
      }

      if (response.status === 429) {
        this.lastCallSuccess = false;
        return {
          provider: this.name,
          matched: false,
          signals: [],
          success: false,
          error: 'Rate limited',
          latencyMs: Date.now() - startTime,
          screenedAt: new Date().toISOString(),
        };
      }

      if (!response.ok) {
        this.lastCallSuccess = false;
        return {
          provider: this.name,
          matched: false,
          signals: [],
          success: false,
          error: `OpenSanctions API returned HTTP ${response.status}`,
          latencyMs: Date.now() - startTime,
          screenedAt: new Date().toISOString(),
        };
      }

      const data = (await response.json()) as OpenSanctionsMatchResponse;
      this.lastCallSuccess = true;

      // --- Filter results by minimum score ---
      const queryResults = data.responses?.['q1']?.results ?? [];
      const filteredResults = queryResults.filter(
        (r) => r.score >= this.minMatchScore,
      );

      // --- Map results to risk signals ---
      const signals: RiskSignal[] = filteredResults.map(
        (result): RiskSignal => {
          const category = this.resolveCategory(result);
          const severity = this.resolveSeverity(result.score);
          const riskScore = Math.round(result.score * 100);

          const actions: ScreeningAction[] = this.resolveActions(severity);
          const description =
            `${result.caption} [${result.schema}] ` +
            `(datasets: ${result.datasets.join(', ')}; ` +
            `score: ${result.score.toFixed(2)})`;

          return {
            provider: this.name,
            category,
            severity,
            riskScore,
            actions,
            description,
            entityName: result.caption,
            entityType: result.schema,
            direction: 'BOTH' as TransactionDirection,
            metadata: {
              openSanctionsId: result.id,
              datasets: result.datasets,
              topics: result.properties?.['topics'] ?? [],
              matchScore: result.score,
            },
          };
        },
      );

      const matched = filteredResults.length > 0;

      const screeningResult: ProviderScreeningResult = {
        provider: this.name,
        matched,
        signals,
        success: true,
        latencyMs: Date.now() - startTime,
        screenedAt: new Date().toISOString(),
      };

      // --- Cache the result ---
      this.cache.set(cacheKey, screeningResult);

      return screeningResult;
    } catch (error) {
      this.lastCallSuccess = false;
      this.lastCallAt = Date.now();

      return {
        provider: this.name,
        matched: false,
        signals: [],
        success: false,
        error: `OpenSanctions API error: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - startTime,
        screenedAt: new Date().toISOString(),
      };
    }
  }

  // --------------------------------------------------------------------------
  // Entity Name Search
  // --------------------------------------------------------------------------

  /**
   * Search for entities by name using the OpenSanctions search endpoint.
   *
   * This is an additional method beyond the ScreeningProvider interface,
   * useful for entity-level due diligence and KYC workflows.
   *
   * @param name - Entity name to search for
   * @returns Array of matching entities with scores and metadata
   */
  async searchEntity(name: string): Promise<
    Array<{
      id: string;
      caption: string;
      score: number;
      datasets: string[];
      topics: string[];
    }>
  > {
    try {
      const encodedName = encodeURIComponent(name);
      const response = await fetch(
        `${this.baseUrl}/search/default?q=${encodedName}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${this.apiKey}`,
            'Accept': 'application/json',
          },
        },
      );

      this.lastCallAt = Date.now();

      if (!response.ok) {
        this.lastCallSuccess = false;
        throw new Error(
          `OpenSanctions search failed with HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as OpenSanctionsSearchResponse;
      this.lastCallSuccess = true;

      return data.results.map((result) => ({
        id: result.id,
        caption: result.caption,
        score: result.score,
        datasets: result.datasets,
        topics: result.properties?.['topics'] ?? [],
      }));
    } catch (error) {
      this.lastCallSuccess = false;
      this.lastCallAt = Date.now();

      throw new Error(
        `OpenSanctions entity search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Health & Stats
  // --------------------------------------------------------------------------

  /**
   * Returns true if the API was reachable on the last call.
   */
  async isHealthy(): Promise<boolean> {
    return this.lastCallSuccess;
  }

  /**
   * Return operational statistics for monitoring and debugging.
   */
  getStats(): { cachedEntries: number; lastCallAt: string | null } {
    return {
      cachedEntries: this.cache.size(),
      lastCallAt: this.lastCallAt !== null
        ? new Date(this.lastCallAt).toISOString()
        : null,
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Resolve the risk category from an OpenSanctions entity's topics.
   *
   * Topic mapping:
   *   - "sanction"  -> SANCTIONS
   *   - "pep"       -> PEP
   *   - "poi"       -> ILLICIT_BEHAVIOR (person of interest)
   *   - "crime"     -> ILLICIT_BEHAVIOR
   *   - (default)   -> SANCTIONS (conservative fallback)
   */
  private resolveCategory(result: OpenSanctionsEntityResult): RiskCategory {
    const topics = result.properties?.['topics'] ?? [];

    if (topics.includes('sanction')) return 'SANCTIONS';
    if (topics.includes('pep')) return 'PEP';
    if (topics.includes('poi')) return 'ILLICIT_BEHAVIOR';
    if (topics.includes('crime')) return 'ILLICIT_BEHAVIOR';

    // Conservative default: if matched but no recognized topic, treat as sanctions
    return 'SANCTIONS';
  }

  /**
   * Resolve risk severity from the match confidence score.
   *
   *   - >= 0.95 -> SEVERE
   *   - >= 0.80 -> HIGH
   *   - >= 0.70 -> MEDIUM
   */
  private resolveSeverity(score: number): RiskSeverity {
    if (score >= 0.95) return 'SEVERE';
    if (score >= 0.8) return 'HIGH';
    return 'MEDIUM';
  }

  /**
   * Resolve recommended actions based on the risk severity.
   */
  private resolveActions(severity: RiskSeverity): ScreeningAction[] {
    switch (severity) {
      case 'SEVERE':
        return ['DENY', 'REVIEW', 'FREEZE_WALLET'];
      case 'HIGH':
        return ['DENY', 'REVIEW'];
      case 'MEDIUM':
        return ['REVIEW', 'ALERT'];
      default:
        return ['ALERT'];
    }
  }
}
