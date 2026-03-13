// ============================================================================
// Kontext Server - Screening Types
// ============================================================================
//
// Shared types for the unified sanctions screening service. These types are
// used server-side only — the SDK has its own ScreeningProvider types.
//

/** Which government sanctions list an entity appears on */
export type SanctionsList =
  | 'OFAC_SDN'
  | 'UK_OFSI'
  | 'EU_CONSOLIDATED'
  | 'OPENSANCTIONS';

/** Entity type classification */
export type EntityType = 'person' | 'entity' | 'vessel' | 'aircraft' | 'unknown';

/** Active or removed from a sanctions list */
export type EntityStatus = 'active' | 'delisted';

// ---------------------------------------------------------------------------
// Unified sanctions entity
// ---------------------------------------------------------------------------

/** Normalized entity from any source */
export interface SanctionsEntity {
  /** Prefixed ID: "ofac:12345", "uk:ABC123", "eu:EU.123", "os:Q123456" */
  id: string;
  /** Primary name */
  name: string;
  /** All known aliases (excluding primary name) */
  aliases: string[];
  /** Entity classification */
  type: EntityType;
  /** Normalized lowercase crypto addresses */
  cryptoAddresses: string[];
  /** Which lists this entity appears on */
  lists: SanctionsList[];
  /** Sanctions programs: "CYBER2", "DPRK", "IRAN", etc. */
  programs: string[];
  /** Active or delisted */
  status: EntityStatus;
  /** Source-specific IDs: { ofac: "12345", uk: "ABC123" } */
  sourceIds: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Screening index (in-memory)
// ---------------------------------------------------------------------------

/** Statistics about the current index */
export interface IndexStats {
  totalEntities: number;
  totalAddresses: number;
  totalNames: number;
  totalAliases: number;
  sourceBreakdown: Record<string, number>;
}

/** The in-memory screening index */
export interface ScreeningIndex {
  /** O(1) address → entity lookup (lowercase addresses) */
  addressMap: Map<string, SanctionsEntity>;
  /** Trigram → Set<entity.id> inverted index for fuzzy name matching */
  trigramIndex: Map<string, Set<string>>;
  /** entity.id → entity lookup */
  entityMap: Map<string, SanctionsEntity>;
  /** Snapshot version (ISO timestamp of build) */
  version: string;
  /** When the index was built */
  builtAt: string;
  /** Index statistics */
  stats: IndexStats;
}

// ---------------------------------------------------------------------------
// Sync pipeline types
// ---------------------------------------------------------------------------

/** A single source's contribution to a sync */
export interface SourceResult {
  source: string;
  entities: SanctionsEntity[];
  durationMs: number;
  error?: string;
}

/** Diff between two index versions */
export interface SyncDiff {
  added: number;
  removed: number;
  modified: number;
  addedIds: string[];
  removedIds: string[];
  modifiedIds: string[];
}

/** Full sync result */
export interface SyncResult {
  success: boolean;
  version: string;
  sources: SourceResult[];
  diff: SyncDiff;
  totalEntities: number;
  totalAddresses: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

/** Response for POST /v1/screening/address */
export interface AddressScreeningResponse {
  hit: boolean;
  address: string;
  entity?: {
    id: string;
    name: string;
    type: EntityType;
    lists: SanctionsList[];
    programs: string[];
    status: EntityStatus;
  };
  listsChecked: SanctionsList[];
  totalAddresses: number;
  durationMs: number;
}

/** A fuzzy match result for entity screening */
export interface EntityMatch {
  entityId: string;
  name: string;
  matchedOn: string;
  similarity: number;
  type: EntityType;
  lists: SanctionsList[];
  programs: string[];
  status: EntityStatus;
  cryptoAddresses: string[];
}

/** Response for POST /v1/screening/entity */
export interface EntityScreeningResponse {
  hit: boolean;
  query: string;
  matches: EntityMatch[];
  threshold: number;
  listsChecked: SanctionsList[];
  totalEntities: number;
  durationMs: number;
}

/** Response for GET /v1/screening/status */
export interface ScreeningStatusResponse {
  syncing: boolean;
  lastSync: string | null;
  nextSync: string | null;
  version: string | null;
  sources: {
    name: string;
    entities: number;
    lastSync: string | null;
    error?: string;
  }[];
  stats: IndexStats | null;
}
