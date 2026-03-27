// ============================================================================
// Kontext Server - Moov Watchman Source
// ============================================================================
//
// Fetches sanctioned entities from a self-hosted Moov Watchman instance.
// Watchman aggregates OFAC SDN, BIS Entity List, and other US government
// sanctions lists behind a simple REST API.
//
// Requires WATCHMAN_URL env var pointing to the Watchman base URL
// (e.g., "http://watchman:8084").
//

import type { SanctionsEntity, EntityType } from '../types.js';
import type { SanctionsSource } from './source-interface.js';

/** Shape of a single SDN entry from Watchman's /v2/search endpoint */
interface WatchmanSDN {
  entityID?: string;
  sdnName?: string;
  sdnType?: string;
  programs?: string[];
  addresses?: Array<{
    address?: string;
    city?: string;
    country?: string;
  }>;
  alts?: Array<{
    alternateID?: string;
    alternateName?: string;
    alternateType?: string;
  }>;
  ids?: Array<{
    idType?: string;
    idNumber?: string;
  }>;
  digitalCurrencyAddresses?: Array<{
    currency?: string;
    address?: string;
  }>;
}

/** Watchman /v2/search response shape */
interface WatchmanSearchResponse {
  SDNs?: WatchmanSDN[];
}

/** Map Watchman sdnType to our EntityType */
function mapEntityType(sdnType: string | undefined): EntityType {
  const t = (sdnType ?? '').trim().toLowerCase();
  if (t === 'individual') return 'person';
  if (t === 'entity') return 'entity';
  if (t === 'vessel') return 'vessel';
  if (t === 'aircraft') return 'aircraft';
  return 'unknown';
}

export class WatchmanSource implements SanctionsSource {
  readonly name = 'Moov Watchman';
  readonly id = 'watchman';

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env['WATCHMAN_URL'] ?? '';
  }

  isAvailable(): boolean {
    return this.baseUrl.length > 0;
  }

  async fetch(): Promise<SanctionsEntity[]> {
    if (!this.isAvailable()) {
      throw new Error('WATCHMAN_URL is not configured');
    }

    // Watchman exposes /v2/search for bulk SDN retrieval.
    // We request a high limit to pull as many entries as possible.
    const url = `${this.baseUrl.replace(/\/+$/, '')}/v2/search?type=person&limit=10000`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Watchman fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as WatchmanSearchResponse;
    const sdns = data.SDNs ?? [];

    const entities: SanctionsEntity[] = [];

    for (const sdn of sdns) {
      const entityId = sdn.entityID ?? '';
      if (!entityId) continue;

      const name = sdn.sdnName ?? '';
      if (!name) continue;

      // Collect crypto addresses from the digitalCurrencyAddresses field
      const cryptoAddresses: string[] = [];
      if (sdn.digitalCurrencyAddresses) {
        for (const dca of sdn.digitalCurrencyAddresses) {
          if (dca.address) {
            cryptoAddresses.push(dca.address.toLowerCase());
          }
        }
      }

      // Collect aliases
      const aliases: string[] = [];
      if (sdn.alts) {
        for (const alt of sdn.alts) {
          if (alt.alternateName && alt.alternateName !== name) {
            aliases.push(alt.alternateName);
          }
        }
      }

      entities.push({
        id: `watchman:${entityId}`,
        name,
        aliases,
        type: mapEntityType(sdn.sdnType),
        cryptoAddresses,
        lists: ['OFAC_SDN'], // Watchman primarily aggregates OFAC data
        programs: sdn.programs ?? [],
        status: 'active',
        sourceIds: { watchman: entityId },
      });
    }

    return entities;
  }
}
