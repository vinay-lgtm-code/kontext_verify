// ============================================================================
// Kontext Server - Trade.gov Consolidated Screening List (CSL) Sync Service
// ============================================================================
//
// Fetches entity data from the Trade.gov Consolidated Screening List API,
// which aggregates 11 U.S. government screening lists including SDN, BIS
// Entity List, State Department, and more. Provides broader coverage beyond
// the SDN-only Treasury XML.
//
// Data flow:
//   Trade.gov CSL API --> Parse entities --> Firestore (entity index)
//
// Source: https://api.trade.gov/consolidated_screening_list/search
// API Key: Free registration at https://api.trade.gov/
// Update frequency: Daily at 5 AM EST
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/** A parsed entity from the CSL API */
export interface CSLEntity {
  /** Entity name */
  name: string;
  /** Known aliases */
  aliases: string[];
  /** Which screening list(s) this entity appears on */
  sources: string[];
  /** Entity type (Individual, Entity, Vessel, Aircraft) */
  entityType: string;
  /** Any digital currency addresses found in remarks or IDs */
  digitalCurrencyAddresses: CSLDigitalCurrencyAddress[];
  /** Country associated with the entity */
  country: string;
  /** Federal Register notice citation */
  federalRegisterNotice: string;
  /** Source list URL */
  sourceListUrl: string;
  /** Unique identifier from CSL */
  sourceId: string;
}

/** A digital currency address extracted from CSL data */
export interface CSLDigitalCurrencyAddress {
  address: string;
  currencyCode: string;
  source: string;
}

/** The stored CSL data */
export interface CSLData {
  /** ISO timestamp of last sync */
  fetchedAt: string;
  /** Total entity count */
  entityCount: number;
  /** Entities with digital currency addresses */
  digitalCurrencyEntities: CSLEntity[];
  /** All entities (for fuzzy name matching) */
  allEntities: CSLEntity[];
  /** Source counts by list */
  sourceCounts: Record<string, number>;
}

/** Configuration for the CSL sync service */
export interface CSLSyncConfig {
  /** Trade.gov API key (free registration required) */
  apiKey: string;
  /** GCP project ID for Firestore */
  gcpProjectId?: string;
  /** Firestore collection for CSL data */
  firestoreCollection?: string;
  /** API base URL */
  apiBaseUrl?: string;
  /** Sources to fetch (default: SDN, SSI, FSE, DPL, UVL, EL) */
  sources?: string[];
  /** Sync interval in milliseconds (default: 24 hours) */
  syncIntervalMs?: number;
  /** Custom fetch function for testing */
  fetchFn?: typeof fetch;
}

// ============================================================================
// Constants
// ============================================================================

/** Trade.gov CSL API base URL */
const DEFAULT_API_BASE_URL = 'https://api.trade.gov/consolidated_screening_list/search';

/** Default sources to query */
const DEFAULT_SOURCES = ['SDN', 'SSI', 'FSE', 'DPL', 'UVL', 'EL'];

/** Default sync interval: 24 hours (CSL updates daily at 5 AM EST) */
const DEFAULT_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Default Firestore collection */
const DEFAULT_FIRESTORE_COLLECTION = 'csl-data';

/** Regex to detect digital currency address references in remarks */
const DIGITAL_CURRENCY_REMARK_REGEX =
  /Digital Currency Address\s*-\s*(\w+)\s+([A-Za-z0-9]+)/g;

// ============================================================================
// CSLSyncService
// ============================================================================

/**
 * Service for syncing Trade.gov Consolidated Screening List data.
 *
 * Provides broader entity coverage beyond SDN, including BIS Entity List,
 * State Department debarment, and more. Extracts digital currency addresses
 * where available and stores entity data for fuzzy name matching.
 *
 * @example
 * ```typescript
 * const cslSync = new CSLSyncService({
 *   apiKey: process.env.TRADE_GOV_API_KEY,
 * });
 *
 * await cslSync.syncOnce();
 * const status = cslSync.getStatus();
 * ```
 */
export class CSLSyncService {
  private readonly config: Required<
    Pick<CSLSyncConfig, 'apiKey' | 'gcpProjectId' | 'firestoreCollection' | 'apiBaseUrl' | 'syncIntervalMs'>
  > & {
    sources: string[];
    fetchFn: typeof fetch;
  };

  /** Last successfully synced data */
  private lastData: CSLData | null = null;

  /** Handle for periodic sync interval */
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  /** Whether a sync is currently in progress */
  private syncing = false;

  constructor(config: CSLSyncConfig) {
    this.config = {
      apiKey: config.apiKey,
      gcpProjectId: config.gcpProjectId ?? 'kontext-verify-sdk',
      firestoreCollection: config.firestoreCollection ?? DEFAULT_FIRESTORE_COLLECTION,
      apiBaseUrl: config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
      sources: config.sources ?? DEFAULT_SOURCES,
      syncIntervalMs: config.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS,
      fetchFn: config.fetchFn ?? globalThis.fetch,
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Run a single sync cycle: fetch CSL API, parse entities, store.
   */
  async syncOnce(): Promise<CSLData> {
    if (this.syncing) {
      throw new Error('CSLSyncService: Sync already in progress');
    }

    this.syncing = true;
    try {
      const allEntities: CSLEntity[] = [];
      let offset = 0;
      const pageSize = 50;
      let hasMore = true;

      while (hasMore) {
        const page = await this.fetchPage(offset, pageSize);
        allEntities.push(...page.entities);

        if (page.entities.length < pageSize || allEntities.length >= page.total) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      // Separate entities with digital currency addresses
      const digitalCurrencyEntities = allEntities.filter(
        (e) => e.digitalCurrencyAddresses.length > 0,
      );

      // Compute source counts
      const sourceCounts: Record<string, number> = {};
      for (const entity of allEntities) {
        for (const source of entity.sources) {
          sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
        }
      }

      const data: CSLData = {
        fetchedAt: new Date().toISOString(),
        entityCount: allEntities.length,
        digitalCurrencyEntities,
        allEntities,
        sourceCounts,
      };

      // Store to Firestore
      await this.storeToFirestore(data);

      this.lastData = data;
      return data;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Start periodic sync on the configured interval.
   */
  startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      void this.syncOnce().catch((error) => {
        console.error(
          '[CSLSync] Periodic sync failed:',
          error instanceof Error ? error.message : String(error),
        );
      });
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop periodic sync.
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get current sync status.
   */
  getStatus(): {
    syncing: boolean;
    lastFetchedAt: string | null;
    entityCount: number;
    digitalCurrencyEntityCount: number;
    sourceCounts: Record<string, number>;
  } {
    return {
      syncing: this.syncing,
      lastFetchedAt: this.lastData?.fetchedAt ?? null,
      entityCount: this.lastData?.entityCount ?? 0,
      digitalCurrencyEntityCount: this.lastData?.digitalCurrencyEntities.length ?? 0,
      sourceCounts: this.lastData?.sourceCounts ?? {},
    };
  }

  /**
   * Get the last synced data.
   */
  getLastData(): CSLData | null {
    return this.lastData;
  }

  // --------------------------------------------------------------------------
  // Internal: API Fetching
  // --------------------------------------------------------------------------

  private async fetchPage(
    offset: number,
    size: number,
  ): Promise<{ entities: CSLEntity[]; total: number }> {
    const sources = this.config.sources.join(',');
    const url = `${this.config.apiBaseUrl}?api_key=${this.config.apiKey}&sources=${sources}&offset=${offset}&size=${size}`;

    let response: Response;
    try {
      response = await this.config.fetchFn(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Kontext-CSL-Sync/1.0',
        },
      });
    } catch (error) {
      throw new Error(
        `CSLSyncService: Failed to fetch CSL API: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `CSLSyncService: Trade.gov API returned HTTP ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      total: number;
      results: Array<{
        name?: string;
        alt_names?: string;
        source?: string;
        type?: string;
        country?: string;
        federal_register_notice?: string;
        source_list_url?: string;
        ids?: Array<{ type?: string; number?: string }>;
        remarks?: string;
        source_information_url?: string;
        id?: string;
      }>;
    };

    const entities: CSLEntity[] = json.results.map((r) => {
      // Extract digital currency addresses from IDs
      const digitalCurrencyAddresses: CSLDigitalCurrencyAddress[] = [];

      if (r.ids) {
        for (const id of r.ids) {
          if (id.type?.startsWith('Digital Currency Address') && id.number) {
            const codeMatch = /Digital Currency Address\s*-\s*(\w+)/.exec(id.type);
            digitalCurrencyAddresses.push({
              address: id.number.trim(),
              currencyCode: codeMatch?.[1] ?? 'UNKNOWN',
              source: r.source ?? 'CSL',
            });
          }
        }
      }

      // Also check remarks for embedded digital currency addresses
      if (r.remarks) {
        let remarkMatch: RegExpExecArray | null;
        const regex = new RegExp(DIGITAL_CURRENCY_REMARK_REGEX.source, 'g');
        while ((remarkMatch = regex.exec(r.remarks)) !== null) {
          digitalCurrencyAddresses.push({
            address: remarkMatch[2]!.trim(),
            currencyCode: remarkMatch[1] ?? 'UNKNOWN',
            source: r.source ?? 'CSL',
          });
        }
      }

      return {
        name: r.name ?? '',
        aliases: r.alt_names ? r.alt_names.split(';').map((a) => a.trim()).filter(Boolean) : [],
        sources: r.source ? [r.source] : [],
        entityType: r.type ?? 'Unknown',
        digitalCurrencyAddresses,
        country: r.country ?? '',
        federalRegisterNotice: r.federal_register_notice ?? '',
        sourceListUrl: r.source_list_url ?? r.source_information_url ?? '',
        sourceId: r.id ?? '',
      };
    });

    return { entities, total: json.total };
  }

  // --------------------------------------------------------------------------
  // Internal: Firestore Storage
  // --------------------------------------------------------------------------

  private async storeToFirestore(data: CSLData): Promise<void> {
    const project = this.config.gcpProjectId;
    const collection = this.config.firestoreCollection;
    const docPath = `projects/${project}/databases/(default)/documents/${collection}/latest`;
    const url = `https://firestore.googleapis.com/v1/${docPath}`;

    // Store summary metadata (not the full entity list, which could be large)
    const firestoreDoc = {
      fields: {
        fetchedAt: { stringValue: data.fetchedAt },
        entityCount: { integerValue: String(data.entityCount) },
        digitalCurrencyEntityCount: { integerValue: String(data.digitalCurrencyEntities.length) },
        sourceCounts: { stringValue: JSON.stringify(data.sourceCounts) },
        // Store digital currency entities as JSON string (compact)
        digitalCurrencyEntities: {
          stringValue: JSON.stringify(data.digitalCurrencyEntities),
        },
      },
    };

    try {
      const response = await this.config.fetchFn(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreDoc),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error');
        throw new Error(`Firestore update failed: HTTP ${response.status} - ${errorText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore update failed')) {
        throw error;
      }
      console.warn(
        '[CSLSync] Firestore update skipped (likely not in GCP environment):',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
