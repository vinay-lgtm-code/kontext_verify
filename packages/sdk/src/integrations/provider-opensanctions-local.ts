// ============================================================================
// Kontext SDK - OpenSanctions Local Provider
// ============================================================================
//
// Screens addresses AND entity names against locally-synced OpenSanctions
// bulk data. Data is downloaded via `kontext sync --lists <datasets>` to
// ~/.kontext/sanctions/ — Kontext never bundles or redistributes the data.
//
// Supports both address and entity name queries (queryTypes: ['both']).
// Uses fuzzy string matching for entity names, exact matching for addresses.
//
// NOT browser-compatible — reads from local filesystem.
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
  EntityStatus,
} from './screening-provider.js';
import { isBlockchainAddress } from './screening-provider.js';

/** Minimum similarity for fuzzy name matching */
const NAME_MATCH_THRESHOLD = 0.85;

/** Minimum matched name length */
const MIN_MATCH_LENGTH = 4;

/** Default data directory */
const DEFAULT_DATA_DIR = '.kontext/sanctions';

/** OpenSanctions entity from bulk JSON */
interface OpenSanctionsEntity {
  id: string;
  caption: string;
  schema: string;
  properties: Record<string, string[]>;
  datasets: string[];
  first_seen: string;
  last_seen: string;
  last_change: string;
}

/**
 * Simple similarity calculation using character-level trigram overlap.
 * Used for entity name matching when the full OFACSanctionsScreener
 * is not needed (local data already filtered by OpenSanctions).
 */
function trigramSimilarity(a: string, b: string): number {
  const aNorm = a.toLowerCase().trim();
  const bNorm = b.toLowerCase().trim();

  if (aNorm === bNorm) return 1.0;
  if (aNorm.length < 2 || bNorm.length < 2) return 0;

  const trigramsA = new Set<string>();
  const trigramsB = new Set<string>();

  for (let i = 0; i <= aNorm.length - 3; i++) {
    trigramsA.add(aNorm.slice(i, i + 3));
  }
  for (let i = 0; i <= bNorm.length - 3; i++) {
    trigramsB.add(bNorm.slice(i, i + 3));
  }

  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) intersection++;
  }

  return (2 * intersection) / (trigramsA.size + trigramsB.size);
}

/**
 * OpenSanctions Local Provider.
 *
 * Screens addresses and entity names against locally-synced OpenSanctions
 * bulk data (331+ sources including APAC domestic lists).
 *
 * Data is NOT bundled — developers download via `kontext sync` and handle
 * their own OpenSanctions licensing (CC-BY-NC 4.0 for non-commercial,
 * commercial license for business use).
 *
 * - **Free tier**, no API key required
 * - **Node.js only** — reads from local filesystem
 * - Supports address + entity name queries
 *
 * @example
 * ```typescript
 * const provider = new OpenSanctionsLocalProvider();
 * if (provider.isAvailable()) {
 *   const result = await provider.screen('Lazarus Group');
 *   // result.hit === true if match found in local data
 * }
 * ```
 */
export class OpenSanctionsLocalProvider implements ScreeningProvider {
  readonly id = 'opensanctions-local';
  readonly name = 'OpenSanctions (Local Data)';
  readonly lists: readonly SanctionsList[] = ['OPENSANCTIONS'];
  readonly requiresApiKey = false;
  readonly browserCompatible = false;
  readonly queryTypes: readonly QueryType[] = ['both'];

  private dataDir: string;
  private entities: OpenSanctionsEntity[] = [];
  private addressSet: Set<string> = new Set();
  private addressToEntity: Map<string, OpenSanctionsEntity> = new Map();
  private loaded = false;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? this.resolveDataDir();
  }

  async screen(
    query: string,
    _context?: ScreeningContext,
  ): Promise<ScreeningResult> {
    const start = Date.now();

    if (!this.loaded) {
      this.loadData();
    }

    if (this.entities.length === 0) {
      return {
        providerId: this.id,
        hit: false,
        matches: [],
        listsChecked: this.lists,
        entriesSearched: 0,
        durationMs: Date.now() - start,
        error: 'No local OpenSanctions data. Run: kontext sync --lists default',
      };
    }

    const matches: ScreeningMatch[] = isBlockchainAddress(query)
      ? this.screenAddress(query)
      : this.screenEntityName(query);

    const hasActiveHit = matches.some((m) => m.entityStatus === 'active');

    return {
      providerId: this.id,
      hit: hasActiveHit,
      matches,
      listsChecked: this.lists,
      entriesSearched: this.entities.length,
      durationMs: Date.now() - start,
    };
  }

  isAvailable(): boolean {
    if (!this.loaded) {
      this.loadData();
    }
    return this.entities.length > 0;
  }

  getEntryCount(): number {
    if (!this.loaded) {
      this.loadData();
    }
    return this.entities.length;
  }

  async sync(): Promise<{ updated: boolean; count: number }> {
    // Sync is handled by the `kontext sync` CLI command.
    // This method reloads data from disk after sync.
    this.loaded = false;
    this.loadData();
    return { updated: true, count: this.entities.length };
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private screenAddress(address: string): ScreeningMatch[] {
    const lower = address.toLowerCase();
    const entity = this.addressToEntity.get(lower);

    if (!entity) return [];

    const entityStatus = this.getEntityStatus(entity);
    return [
      {
        list: 'OPENSANCTIONS',
        matchType: 'exact_address',
        similarity: 1.0,
        matchedValue: address,
        entityStatus,
        entityName: entity.caption,
        program: entity.datasets.join(', '),
      },
    ];
  }

  private screenEntityName(query: string): ScreeningMatch[] {
    const matches: ScreeningMatch[] = [];
    const queryLower = query.toLowerCase().trim();

    for (const entity of this.entities) {
      // Check entity caption
      const captionSim = trigramSimilarity(queryLower, entity.caption);
      if (captionSim >= NAME_MATCH_THRESHOLD && entity.caption.length >= MIN_MATCH_LENGTH) {
        matches.push(this.entityToMatch(entity, entity.caption, captionSim));
        continue;
      }

      // Check aliases
      const aliases = entity.properties['alias'] ?? [];
      for (const alias of aliases) {
        const aliasSim = trigramSimilarity(queryLower, alias);
        if (aliasSim >= NAME_MATCH_THRESHOLD && alias.length >= MIN_MATCH_LENGTH) {
          matches.push(this.entityToMatch(entity, alias, aliasSim));
          break;
        }
      }
    }

    // Sort by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);

    // Return top 5 matches
    return matches.slice(0, 5);
  }

  private entityToMatch(
    entity: OpenSanctionsEntity,
    matchedValue: string,
    similarity: number,
  ): ScreeningMatch {
    return {
      list: 'OPENSANCTIONS',
      matchType: similarity >= 0.99 ? 'exact_address' : 'fuzzy_name',
      similarity,
      matchedValue,
      entityStatus: this.getEntityStatus(entity),
      entityName: entity.caption,
      program: entity.datasets.join(', '),
    };
  }

  private getEntityStatus(entity: OpenSanctionsEntity): EntityStatus {
    // OpenSanctions removes delisted entities from exports,
    // so presence in the dataset implies active status
    return 'active';
  }

  private loadData(): void {
    this.loaded = true;
    this.entities = [];
    this.addressSet.clear();
    this.addressToEntity.clear();

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pathMod = require('path');

      const dataPath = pathMod.resolve(this.dataDir);
      if (!fs.existsSync(dataPath)) return;

      // Load all JSON files in the data directory
      const files: string[] = fs.readdirSync(dataPath).filter(
        (f: string) => f.endsWith('.json'),
      );

      for (const file of files) {
        const filePath = pathMod.join(dataPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // OpenSanctions bulk JSON uses NDJSON (newline-delimited JSON)
        const lines = content.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          try {
            const entity = JSON.parse(line) as OpenSanctionsEntity;
            this.entities.push(entity);

            // Index crypto addresses for O(1) lookup
            const addresses = entity.properties['cryptoAddress'] ?? [];
            for (const addr of addresses) {
              const lower = addr.toLowerCase();
              this.addressSet.add(lower);
              this.addressToEntity.set(lower, entity);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch {
      // Filesystem not available or data directory doesn't exist
    }
  }

  private resolveDataDir(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const os = require('os');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pathMod = require('path');
      return pathMod.join(os.homedir(), DEFAULT_DATA_DIR);
    } catch {
      return DEFAULT_DATA_DIR;
    }
  }
}
