// ============================================================================
// Kontext Server - OpenSanctions Bulk Source
// ============================================================================
//
// Downloads and parses OpenSanctions bulk NDJSON data.
// REQUIRES a commercial bulk data license (€595/mo) for production use.
// Gated behind OPENSANCTIONS_BULK_KEY env var — skipped if absent.
//
// Uses the OpenSanctions NDJSON bulk export format (FtM entities).
//

import type { SanctionsEntity, EntityType } from '../types.js';
import type { SanctionsSource } from './source-interface.js';

// OpenSanctions bulk export — requires API key
const OPENSANCTIONS_BULK_URL = 'https://data.opensanctions.org/datasets/latest/default/entities.ftm.json';

/** OpenSanctions FtM entity from NDJSON */
interface FtMEntity {
  id: string;
  caption: string;
  schema: string;
  properties: Record<string, string[]>;
  datasets: string[];
  first_seen?: string;
  last_seen?: string;
  last_change?: string;
}

/** Map FtM schema to our EntityType */
function mapEntityType(schema: string): EntityType {
  const s = schema.toLowerCase();
  if (s === 'person' || s === 'legalentity') return 'person';
  if (s === 'organization' || s === 'company') return 'entity';
  if (s === 'vessel') return 'vessel';
  if (s === 'airplane') return 'aircraft';
  return 'unknown';
}

/** Check if a string looks like a crypto address */
function isCryptoAddress(value: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) return true;
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(value)) return true;
  if (/^bc1[a-z0-9]{39,59}$/.test(value)) return true;
  return false;
}

export class OpenSanctionsSource implements SanctionsSource {
  readonly name = 'OpenSanctions';
  readonly id = 'opensanctions';

  isAvailable(): boolean {
    return !!process.env['OPENSANCTIONS_BULK_KEY'];
  }

  async fetch(): Promise<SanctionsEntity[]> {
    const apiKey = process.env['OPENSANCTIONS_BULK_KEY'];
    if (!apiKey) {
      return [];
    }

    const res = await fetch(OPENSANCTIONS_BULK_URL, {
      headers: { Authorization: `ApiKey ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch OpenSanctions: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    const entities: SanctionsEntity[] = [];

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;

      let entity: FtMEntity;
      try {
        entity = JSON.parse(line) as FtMEntity;
      } catch {
        continue; // Skip malformed lines
      }

      // Only include sanctioned entities (not companies, addresses, etc.)
      const schema = entity.schema?.toLowerCase() ?? '';
      if (!['person', 'organization', 'company', 'legalentity', 'vessel', 'airplane'].includes(schema)) {
        continue;
      }

      const name = entity.caption || '';
      if (!name) continue;

      // Extract aliases from properties
      const aliases: string[] = [];
      const nameProps = entity.properties?.['name'] ?? [];
      const aliasProps = entity.properties?.['alias'] ?? [];
      const weakAliasProps = entity.properties?.['weakAlias'] ?? [];

      for (const n of [...nameProps, ...aliasProps, ...weakAliasProps]) {
        if (n && n !== name && !aliases.includes(n)) {
          aliases.push(n);
        }
      }

      // Extract crypto addresses
      const cryptoAddresses: string[] = [];
      const cryptoProps = entity.properties?.['cryptoWallets'] ?? [];
      const addressProps = entity.properties?.['address'] ?? [];

      for (const addr of [...cryptoProps, ...addressProps]) {
        if (addr && isCryptoAddress(addr.trim())) {
          cryptoAddresses.push(addr.trim().toLowerCase());
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

    return entities;
  }
}
