// ============================================================================
// Kontext Server - Trigram Fuzzy Matching
// ============================================================================
//
// Trigram-based fuzzy string matching with an inverted index for O(candidates)
// entity name search instead of O(N) full-scan. Used for Travel Rule name
// screening across ~95K government sanctions entities.
//
// Algorithm:
// 1. Build: extract trigrams from every entity name + alias → inverted map
// 2. Query: extract query trigrams → collect candidate entity IDs → score
//    top candidates via Jaccard similarity → return matches above threshold
//

/** Default similarity threshold for fuzzy name matching */
export const DEFAULT_THRESHOLD = 0.85;

/** Maximum candidates to score (limits worst-case latency) */
const MAX_CANDIDATES = 200;

// ---------------------------------------------------------------------------
// Trigram extraction
// ---------------------------------------------------------------------------

/** Normalize a string for trigram extraction: lowercase, trim, collapse whitespace */
export function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Extract character-level trigrams from a string */
export function extractTrigrams(s: string): Set<string> {
  const norm = normalize(s);
  const trigrams = new Set<string>();
  for (let i = 0; i <= norm.length - 3; i++) {
    trigrams.add(norm.slice(i, i + 3));
  }
  return trigrams;
}

// ---------------------------------------------------------------------------
// Jaccard similarity
// ---------------------------------------------------------------------------

/**
 * Compute Dice/Sørensen coefficient between two trigram sets.
 * Formula: (2 * |A ∩ B|) / (|A| + |B|)
 *
 * Consistent with the existing SDK implementation in
 * provider-opensanctions-local.ts:52-77.
 */
export function trigramSimilarity(a: string, b: string): number {
  const aNorm = normalize(a);
  const bNorm = normalize(b);

  if (aNorm === bNorm) return 1.0;
  if (aNorm.length < 2 || bNorm.length < 2) return 0;

  const trigramsA = extractTrigrams(aNorm);
  const trigramsB = extractTrigrams(bNorm);

  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) intersection++;
  }

  return (2 * intersection) / (trigramsA.size + trigramsB.size);
}

// ---------------------------------------------------------------------------
// Trigram inverted index
// ---------------------------------------------------------------------------

/**
 * Build an inverted index: trigram → Set<entityId>.
 *
 * Each entity contributes trigrams from its name and all aliases.
 * At query time, we collect candidate entity IDs by unioning the sets
 * for each query trigram, then score only those candidates.
 */
export function buildTrigramIndex(
  entries: Iterable<{ id: string; name: string; aliases: string[] }>,
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  for (const entry of entries) {
    const names = [entry.name, ...entry.aliases];
    for (const name of names) {
      const trigrams = extractTrigrams(name);
      for (const tri of trigrams) {
        let set = index.get(tri);
        if (!set) {
          set = new Set();
          index.set(tri, set);
        }
        set.add(entry.id);
      }
    }
  }

  return index;
}

/**
 * Search the trigram index for candidate entity IDs matching a query.
 *
 * Returns the top N entity IDs ranked by how many query trigrams they
 * share (pre-filter before exact Jaccard scoring).
 */
export function searchCandidates(
  query: string,
  trigramIndex: Map<string, Set<string>>,
  maxCandidates: number = MAX_CANDIDATES,
): string[] {
  const queryTrigrams = extractTrigrams(query);
  if (queryTrigrams.size === 0) return [];

  // Count how many query trigrams each entity matches
  const counts = new Map<string, number>();
  for (const tri of queryTrigrams) {
    const entityIds = trigramIndex.get(tri);
    if (entityIds) {
      for (const id of entityIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }

  // Sort by count descending, take top N
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCandidates)
    .map(([id]) => id);
}
