// ============================================================================
// Kontext Server - OpenSanctions / Yente Source
// ============================================================================
//
// Fetches sanctions entities from a self-hosted Yente API instance.
// Yente (https://github.com/opensanctions/yente) serves the OpenSanctions
// dataset via a REST API using Follow the Money (FtM) entity format.
//
// Gated behind YENTE_URL env var — skipped if absent.
// Example: YENTE_URL=https://yente.example.com
//

import type { SanctionsEntity, EntityType } from '../types.js';
import type { SanctionsSource } from './source-interface.js';

/** Default page size for Yente bulk export */
const PAGE_LIMIT = 10_000;

/** Yente FtM entity from the /entities endpoint */
interface YenteEntity {
  id: string;
  caption: string;
  schema: string;
  properties: Record<string, string[]>;
  datasets: string[];
  first_seen?: string;
  last_seen?: string;
  last_change?: string;
}

/** Yente paginated response envelope */
interface YenteEntitiesResponse {
  results: YenteEntity[];
  total: number;
  limit: number;
  offset: number;
}

/** Map Yente FtM schema to our EntityType */
function mapEntityType(schema: string): EntityType {
  const s = schema.toLowerCase();
  if (s === 'person' || s === 'legalentity') return 'person';
  if (s === 'organization' || s === 'company') return 'entity';
  if (s === 'vessel') return 'vessel';
  if (s === 'airplane') return 'aircraft';
  return 'unknown';
}

/** Relevant FtM schemas for sanctions screening */
const RELEVANT_SCHEMAS = new Set([
  'person',
  'organization',
  'company',
  'legalentity',
  'vessel',
  'airplane',
]);

/** Check if a string looks like a crypto address */
function isCryptoAddress(value: string): boolean {
  // Ethereum-style (0x + 40 hex)
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) return true;
  // Bitcoin-style (starts with 1, 3, or bc1)
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(value)) return true;
  if (/^bc1[a-z0-9]{39,59}$/.test(value)) return true;
  return false;
}

export class YenteSource implements SanctionsSource {
  readonly name = 'OpenSanctions (Yente)';
  readonly id = 'opensanctions';

  isAvailable(): boolean {
    return !!process.env['YENTE_URL'];
  }

  async fetch(): Promise<SanctionsEntity[]> {
    const baseUrl = process.env['YENTE_URL'];
    if (!baseUrl) {
      return [];
    }

    const entities: SanctionsEntity[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const url = new URL('/entities', baseUrl);
      url.searchParams.set('dataset', 'default');
      url.searchParams.set('limit', String(PAGE_LIMIT));
      url.searchParams.set('offset', String(offset));

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Yente API error: ${res.status} ${res.statusText} (${url.pathname})`);
      }

      const data = (await res.json()) as YenteEntitiesResponse;
      total = data.total;

      for (const entity of data.results) {
        const schema = entity.schema?.toLowerCase() ?? '';
        if (!RELEVANT_SCHEMAS.has(schema)) continue;

        const name = entity.caption || '';
        if (!name) continue;

        // Extract aliases
        const aliases: string[] = [];
        const nameProps = entity.properties?.['name'] ?? [];
        const aliasProps = entity.properties?.['alias'] ?? [];
        const weakAliasProps = entity.properties?.['weakAlias'] ?? [];

        for (const n of [...nameProps, ...aliasProps, ...weakAliasProps]) {
          if (n && n !== name && !aliases.includes(n)) {
            aliases.push(n);
          }
        }

        // Extract crypto addresses from cryptoWalletId, cryptoAddress, and address
        const cryptoAddresses: string[] = [];
        const walletIdProps = entity.properties?.['cryptoWalletId'] ?? [];
        const cryptoAddrProps = entity.properties?.['cryptoAddress'] ?? [];
        const addressProps = entity.properties?.['address'] ?? [];

        for (const addr of [...walletIdProps, ...cryptoAddrProps, ...addressProps]) {
          const trimmed = addr?.trim() ?? '';
          if (trimmed && isCryptoAddress(trimmed)) {
            cryptoAddresses.push(trimmed.toLowerCase());
          }
        }

        // Extract programs/topics
        const programs = entity.properties?.['topics'] ?? [];

        entities.push({
          id: `os:${entity.id}`,
          name,
          aliases: aliases.slice(0, 50),
          type: mapEntityType(schema),
          cryptoAddresses,
          lists: ['OPENSANCTIONS'],
          programs,
          status: 'active',
          sourceIds: { opensanctions: entity.id },
        });
      }

      offset += data.results.length;

      // Safety: if results are empty, break to avoid infinite loop
      if (data.results.length === 0) break;
    }

    return entities;
  }
}
