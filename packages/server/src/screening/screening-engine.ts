// ============================================================================
// Kontext Server - Screening Engine
// ============================================================================
//
// Orchestrates the in-memory screening index lifecycle:
// - Cold start: load from GCS snapshot
// - Sync: download from sources, build index, upload snapshot
// - Query: address lookup (O(1)), entity name search (trigram fuzzy)
//

import type {
  ScreeningIndex,
  AddressScreeningResponse,
  EntityScreeningResponse,
  ScreeningStatusResponse,
  SyncResult,
  SanctionsList,
} from './types.js';
import type { SanctionsSource } from './sources/source-interface.js';
import { lookupAddress, searchEntities } from './screening-index.js';
import { runSync, loadFromSnapshot } from './sync-pipeline.js';
import { GCSStorage } from './gcs-storage.js';
import { DEFAULT_THRESHOLD } from './fuzzy.js';

/** 14 days in milliseconds */
const DEFAULT_SYNC_INTERVAL_MS = 1_209_600_000;

export interface ScreeningEngineConfig {
  /** GCS bucket name for snapshots */
  bucket?: string;
  /** Sync interval in ms (default: 14 days) */
  syncIntervalMs?: number;
  /** Disable GCS (for testing) */
  disableGCS?: boolean;
}

export class ScreeningEngine {
  private index: ScreeningIndex | null = null;
  private sources: SanctionsSource[] = [];
  private storage: GCSStorage | null;
  private syncIntervalMs: number;
  private syncing = false;
  private lastSync: string | null = null;
  private lastSyncResult: SyncResult | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ScreeningEngineConfig = {}) {
    this.storage = config.disableGCS ? null : new GCSStorage(config.bucket);
    this.syncIntervalMs = config.syncIntervalMs ??
      (parseInt(process.env['SCREENING_SYNC_INTERVAL_MS'] ?? '', 10) || DEFAULT_SYNC_INTERVAL_MS);
  }

  /**
   * Initialize the engine:
   * 1. Register sources
   * 2. Try loading from GCS snapshot (fast cold start)
   * 3. If no snapshot, run initial sync
   */
  async init(sources: SanctionsSource[]): Promise<void> {
    this.sources = sources;

    // Try cold-start from GCS snapshot
    if (this.storage) {
      try {
        const snapshot = await loadFromSnapshot(this.storage);
        if (snapshot) {
          this.index = snapshot;
          this.lastSync = snapshot.builtAt;
          console.log(`[screening] Loaded snapshot: ${snapshot.stats.totalEntities} entities, ${snapshot.stats.totalAddresses} addresses`);
          return;
        }
      } catch (err) {
        console.error('[screening] Failed to load GCS snapshot:', err);
      }
    }

    // No snapshot — run initial sync
    console.log('[screening] No snapshot found, running initial sync...');
    await this.sync();
  }

  /**
   * Start periodic sync (call after init).
   */
  startPeriodicSync(): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => {
      this.sync().catch(err => {
        console.error('[screening] Periodic sync failed:', err);
      });
    }, this.syncIntervalMs);
  }

  /**
   * Stop periodic sync.
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Run a full sync: download sources, build index, upload snapshot.
   */
  async sync(): Promise<SyncResult> {
    if (this.syncing) {
      return {
        success: false,
        version: this.index?.version ?? '',
        sources: [],
        diff: { added: 0, removed: 0, modified: 0, addedIds: [], removedIds: [], modifiedIds: [] },
        totalEntities: this.index?.stats.totalEntities ?? 0,
        totalAddresses: this.index?.stats.totalAddresses ?? 0,
        durationMs: 0,
      };
    }

    this.syncing = true;
    try {
      const { index, result } = await runSync(this.sources, this.index, this.storage);
      this.index = index;
      this.lastSync = new Date().toISOString();
      this.lastSyncResult = result;
      console.log(`[screening] Sync complete: ${result.totalEntities} entities, ${result.totalAddresses} addresses, +${result.diff.added}/-${result.diff.removed}/~${result.diff.modified}`);
      return result;
    } finally {
      this.syncing = false;
    }
  }

  // -------------------------------------------------------------------------
  // Query methods
  // -------------------------------------------------------------------------

  /**
   * Screen a crypto address. O(1) Map lookup.
   */
  screenAddress(address: string): AddressScreeningResponse {
    const t0 = performance.now();

    if (!this.index) {
      return {
        hit: false,
        address,
        listsChecked: [],
        totalAddresses: 0,
        durationMs: 0,
      };
    }

    const entity = lookupAddress(this.index, address);
    const listsChecked = this.getListsChecked();

    return {
      hit: !!entity,
      address: address.toLowerCase(),
      entity: entity ? {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        lists: entity.lists,
        programs: entity.programs,
        status: entity.status,
      } : undefined,
      listsChecked,
      totalAddresses: this.index.stats.totalAddresses,
      durationMs: Math.round((performance.now() - t0) * 1000) / 1000,
    };
  }

  /**
   * Screen an entity name. Trigram fuzzy matching.
   */
  screenEntity(
    query: string,
    threshold: number = DEFAULT_THRESHOLD,
    maxResults: number = 5,
  ): EntityScreeningResponse {
    const t0 = performance.now();

    if (!this.index) {
      return {
        hit: false,
        query,
        matches: [],
        threshold,
        listsChecked: [],
        totalEntities: 0,
        durationMs: 0,
      };
    }

    const matches = searchEntities(this.index, query, threshold, maxResults);
    const listsChecked = this.getListsChecked();

    return {
      hit: matches.length > 0,
      query,
      matches,
      threshold,
      listsChecked,
      totalEntities: this.index.stats.totalEntities,
      durationMs: Math.round((performance.now() - t0) * 1000) / 1000,
    };
  }

  /**
   * Get screening service status.
   */
  getStatus(): ScreeningStatusResponse {
    const nextSync = this.lastSync
      ? new Date(new Date(this.lastSync).getTime() + this.syncIntervalMs).toISOString()
      : null;

    return {
      syncing: this.syncing,
      lastSync: this.lastSync,
      nextSync,
      version: this.index?.version ?? null,
      sources: this.sources.map(s => {
        const sr = this.lastSyncResult?.sources.find(r => r.source === s.id);
        return {
          name: s.name,
          entities: sr?.entities.length ?? 0,
          lastSync: this.lastSync,
          error: sr?.error,
        };
      }),
      stats: this.index?.stats ?? null,
    };
  }

  /**
   * Whether the engine has a loaded index.
   */
  isReady(): boolean {
    return this.index !== null;
  }

  private getListsChecked(): SanctionsList[] {
    const lists = new Set<SanctionsList>();
    for (const source of this.sources) {
      if (source.id === 'ofac') lists.add('OFAC_SDN');
      if (source.id === 'uk') lists.add('UK_OFSI');
      if (source.id === 'eu') lists.add('EU_CONSOLIDATED');
      if (source.id === 'opensanctions') lists.add('OPENSANCTIONS');
    }
    return Array.from(lists);
  }
}
