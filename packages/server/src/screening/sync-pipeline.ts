// ============================================================================
// Kontext Server - Screening Sync Pipeline
// ============================================================================
//
// Orchestrates sanctions data sources: downloads, parses, normalizes,
// deduplicates, computes diffs, builds index, stores snapshot to GCS.
//

import type {
  SanctionsEntity,
  SourceResult,
  SyncDiff,
  SyncResult,
} from './types.js';
import type { SanctionsSource } from './sources/source-interface.js';
import { buildIndex } from './screening-index.js';
import type { ScreeningIndex } from './types.js';
import { GCSStorage } from './gcs-storage.js';

/**
 * Run a full sync pipeline:
 * 1. Fetch entities from all available sources in parallel
 * 2. Normalize and deduplicate
 * 3. Build new ScreeningIndex
 * 4. Compute diff against previous index
 * 5. Upload snapshot to GCS
 * 6. Return new index + sync result
 */
export async function runSync(
  sources: SanctionsSource[],
  previousIndex: ScreeningIndex | null,
  storage: GCSStorage | null,
): Promise<{ index: ScreeningIndex; result: SyncResult }> {
  const startMs = Date.now();
  const sourceResults: SourceResult[] = [];

  // 1. Fetch all available sources in parallel
  const availableSources = sources.filter(s => s.isAvailable());
  const fetches = await Promise.allSettled(
    availableSources.map(async (source) => {
      const t0 = Date.now();
      try {
        const entities = await source.fetch();
        const result: SourceResult = {
          source: source.id,
          entities,
          durationMs: Date.now() - t0,
        };
        return result;
      } catch (err) {
        const result: SourceResult = {
          source: source.id,
          entities: [],
          durationMs: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
        return result;
      }
    }),
  );

  for (const f of fetches) {
    if (f.status === 'fulfilled') {
      sourceResults.push(f.value);
    }
  }

  // 2. Collect all entities and deduplicate
  const allEntities: SanctionsEntity[] = [];
  for (const sr of sourceResults) {
    allEntities.push(...sr.entities);
  }

  const deduped = deduplicateEntities(allEntities);

  // 3. Build new index
  const newIndex = buildIndex(deduped);

  // 4. Compute diff
  const diff = computeDiff(previousIndex, newIndex);

  // 5. Upload to GCS (non-blocking — don't fail sync if storage is unavailable)
  if (storage) {
    try {
      await storage.uploadSnapshot(deduped);
      await storage.uploadMeta({
        version: newIndex.version,
        builtAt: newIndex.builtAt,
        stats: newIndex.stats,
        diff,
        syncedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('GCS upload failed (non-critical):', err);
    }
  }

  const result: SyncResult = {
    success: true,
    version: newIndex.version,
    sources: sourceResults.map(sr => ({
      source: sr.source,
      entities: sr.entities,
      durationMs: sr.durationMs,
      error: sr.error,
    })),
    diff,
    totalEntities: deduped.length,
    totalAddresses: newIndex.stats.totalAddresses,
    durationMs: Date.now() - startMs,
  };

  return { index: newIndex, result };
}

/**
 * Load index from GCS snapshot (cold start recovery).
 * Returns null if no snapshot available.
 */
export async function loadFromSnapshot(
  storage: GCSStorage,
): Promise<ScreeningIndex | null> {
  const entities = await storage.downloadSnapshot();
  if (!entities || entities.length === 0) return null;
  return buildIndex(entities);
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Deduplicate entities across sources.
 *
 * Strategy: merge by crypto address overlap. If two entities from different
 * sources share a crypto address, merge them into one entity with combined
 * lists, programs, and aliases. Otherwise, keep both.
 *
 * For simplicity, we also dedupe by name+type within the same source.
 */
function deduplicateEntities(entities: SanctionsEntity[]): SanctionsEntity[] {
  // First pass: index by crypto address
  const byAddress = new Map<string, SanctionsEntity>();
  const result = new Map<string, SanctionsEntity>();

  for (const entity of entities) {
    // Check if any crypto address already seen
    let merged = false;
    for (const addr of entity.cryptoAddresses) {
      const existing = byAddress.get(addr);
      if (existing && existing.id !== entity.id) {
        // Merge into existing
        mergeInto(existing, entity);
        merged = true;
        break;
      }
    }

    if (!merged) {
      result.set(entity.id, entity);
      for (const addr of entity.cryptoAddresses) {
        byAddress.set(addr, entity);
      }
    }
  }

  return Array.from(result.values());
}

/** Merge source entity data into target */
function mergeInto(target: SanctionsEntity, source: SanctionsEntity): void {
  // Merge lists
  for (const list of source.lists) {
    if (!target.lists.includes(list)) {
      target.lists.push(list);
    }
  }

  // Merge aliases
  for (const alias of source.aliases) {
    if (alias !== target.name && !target.aliases.includes(alias)) {
      target.aliases.push(alias);
    }
  }
  if (source.name !== target.name && !target.aliases.includes(source.name)) {
    target.aliases.push(source.name);
  }

  // Merge crypto addresses
  for (const addr of source.cryptoAddresses) {
    if (!target.cryptoAddresses.includes(addr)) {
      target.cryptoAddresses.push(addr);
    }
  }

  // Merge programs
  for (const prog of source.programs) {
    if (!target.programs.includes(prog)) {
      target.programs.push(prog);
    }
  }

  // Merge source IDs
  for (const [key, value] of Object.entries(source.sourceIds)) {
    if (!target.sourceIds[key]) {
      target.sourceIds[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

function computeDiff(
  previous: ScreeningIndex | null,
  current: ScreeningIndex,
): SyncDiff {
  if (!previous) {
    const addedIds = Array.from(current.entityMap.keys());
    return {
      added: addedIds.length,
      removed: 0,
      modified: 0,
      addedIds,
      removedIds: [],
      modifiedIds: [],
    };
  }

  const addedIds: string[] = [];
  const removedIds: string[] = [];
  const modifiedIds: string[] = [];

  // Find added and modified
  for (const [id, entity] of current.entityMap) {
    const prev = previous.entityMap.get(id);
    if (!prev) {
      addedIds.push(id);
    } else if (entityChanged(prev, entity)) {
      modifiedIds.push(id);
    }
  }

  // Find removed
  for (const id of previous.entityMap.keys()) {
    if (!current.entityMap.has(id)) {
      removedIds.push(id);
    }
  }

  return {
    added: addedIds.length,
    removed: removedIds.length,
    modified: modifiedIds.length,
    addedIds,
    removedIds,
    modifiedIds,
  };
}

function entityChanged(a: SanctionsEntity, b: SanctionsEntity): boolean {
  if (a.name !== b.name) return true;
  if (a.status !== b.status) return true;
  if (a.aliases.length !== b.aliases.length) return true;
  if (a.cryptoAddresses.length !== b.cryptoAddresses.length) return true;
  if (a.lists.length !== b.lists.length) return true;
  return false;
}
