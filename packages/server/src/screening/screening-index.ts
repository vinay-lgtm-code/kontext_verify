// ============================================================================
// Kontext Server - In-Memory Screening Index
// ============================================================================
//
// Builds and manages the in-memory ScreeningIndex from a list of
// SanctionsEntity records. Provides O(1) address lookup and trigram-indexed
// fuzzy entity name search.
//

import type {
  SanctionsEntity,
  ScreeningIndex,
  IndexStats,
  EntityMatch,
} from './types.js';
import {
  buildTrigramIndex,
  searchCandidates,
  trigramSimilarity,
  DEFAULT_THRESHOLD,
} from './fuzzy.js';

// ---------------------------------------------------------------------------
// Index construction
// ---------------------------------------------------------------------------

/**
 * Build a ScreeningIndex from a list of entities.
 *
 * - addressMap: lowercase crypto address → entity (O(1) lookup)
 * - trigramIndex: trigram → Set<entity.id> (fuzzy name pre-filter)
 * - entityMap: entity.id → entity (direct lookup)
 */
export function buildIndex(entities: SanctionsEntity[]): ScreeningIndex {
  const addressMap = new Map<string, SanctionsEntity>();
  const entityMap = new Map<string, SanctionsEntity>();

  let totalNames = 0;
  let totalAliases = 0;
  const sourceBreakdown: Record<string, number> = {};

  for (const entity of entities) {
    entityMap.set(entity.id, entity);

    // Index all crypto addresses
    for (const addr of entity.cryptoAddresses) {
      addressMap.set(addr.toLowerCase(), entity);
    }

    // Count names/aliases
    totalNames++;
    totalAliases += entity.aliases.length;

    // Source breakdown
    for (const list of entity.lists) {
      sourceBreakdown[list] = (sourceBreakdown[list] ?? 0) + 1;
    }
  }

  // Build trigram inverted index
  const trigramIndex = buildTrigramIndex(entities);

  const stats: IndexStats = {
    totalEntities: entities.length,
    totalAddresses: addressMap.size,
    totalNames,
    totalAliases,
    sourceBreakdown,
  };

  return {
    addressMap,
    trigramIndex,
    entityMap,
    version: new Date().toISOString(),
    builtAt: new Date().toISOString(),
    stats,
  };
}

// ---------------------------------------------------------------------------
// Address lookup
// ---------------------------------------------------------------------------

/**
 * Look up a crypto address in the index. O(1) Map lookup.
 * Returns the entity if found, null otherwise.
 */
export function lookupAddress(
  index: ScreeningIndex,
  address: string,
): SanctionsEntity | null {
  return index.addressMap.get(address.toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Entity name search
// ---------------------------------------------------------------------------

/**
 * Search for entities matching a name query using fuzzy trigram matching.
 *
 * 1. Extract query trigrams and find candidate entity IDs via inverted index
 * 2. Score each candidate's name + aliases against query via Jaccard similarity
 * 3. Return matches above threshold, sorted by similarity descending
 */
export function searchEntities(
  index: ScreeningIndex,
  query: string,
  threshold: number = DEFAULT_THRESHOLD,
  maxResults: number = 5,
): EntityMatch[] {
  if (query.trim().length < 3) return [];

  // Get candidate entity IDs from trigram index
  const candidateIds = searchCandidates(query, index.trigramIndex);
  const matches: EntityMatch[] = [];

  for (const id of candidateIds) {
    const entity = index.entityMap.get(id);
    if (!entity) continue;

    // Score primary name
    let bestSimilarity = trigramSimilarity(query, entity.name);
    let bestMatchedOn = entity.name;

    // Score aliases — keep best
    for (const alias of entity.aliases) {
      const sim = trigramSimilarity(query, alias);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatchedOn = alias;
      }
    }

    if (bestSimilarity >= threshold) {
      matches.push({
        entityId: entity.id,
        name: entity.name,
        matchedOn: bestMatchedOn,
        similarity: Math.round(bestSimilarity * 1000) / 1000,
        type: entity.type,
        lists: entity.lists,
        programs: entity.programs,
        status: entity.status,
        cryptoAddresses: entity.cryptoAddresses,
      });
    }
  }

  // Sort by similarity descending, take top N
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches.slice(0, maxResults);
}
