// ============================================================================
// Kontext Server - Sanctions Source Interface
// ============================================================================

import type { SanctionsEntity } from '../types.js';

/** A sanctions data source that can be fetched and parsed */
export interface SanctionsSource {
  /** Human-readable source name */
  readonly name: string;
  /** Source identifier for logging */
  readonly id: string;
  /** Whether this source is available (e.g., has required env vars) */
  isAvailable(): boolean;
  /** Fetch and parse entities from this source */
  fetch(): Promise<SanctionsEntity[]>;
}
