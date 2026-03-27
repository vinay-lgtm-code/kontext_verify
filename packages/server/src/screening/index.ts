// ============================================================================
// Kontext Server - Screening Module Exports
// ============================================================================

export type {
  SanctionsEntity,
  SanctionsList,
  EntityType,
  EntityStatus,
  ScreeningIndex,
  IndexStats,
  SourceResult,
  SyncDiff,
  SyncResult,
  AddressScreeningResponse,
  EntityScreeningResponse,
  EntityMatch,
  ScreeningStatusResponse,
} from './types.js';

export { ScreeningEngine } from './screening-engine.js';
export type { ScreeningEngineConfig } from './screening-engine.js';

export { buildIndex, lookupAddress, searchEntities } from './screening-index.js';
export { buildTrigramIndex, searchCandidates, trigramSimilarity, extractTrigrams, normalize, DEFAULT_THRESHOLD } from './fuzzy.js';
export { GCSStorage } from './gcs-storage.js';
export { runSync, loadFromSnapshot } from './sync-pipeline.js';

export type { SanctionsSource } from './sources/source-interface.js';
export { OFACSDNSource } from './sources/ofac-sdn-source.js';
export { UKSanctionsSource } from './sources/uk-sanctions-source.js';
export { EUFSFSource } from './sources/eu-fsf-source.js';
export { OpenSanctionsSource } from './sources/opensanctions-source.js';
export { WatchmanSource } from './sources/watchman-source.js';
