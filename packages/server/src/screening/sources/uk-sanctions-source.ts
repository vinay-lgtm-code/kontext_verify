// ============================================================================
// Kontext Server - UK Sanctions List Source
// ============================================================================
//
// Downloads and parses the UK Sanctions List from GOV.UK.
// Uses the CSV format for simplicity and reliability.
//
// The UK Sanctions List replaced the OFSI Consolidated List on 28 Jan 2026.
// Format: CSV with columns for name, aliases, addresses, and regime info.
//

import type { SanctionsEntity, EntityType } from '../types.js';
import type { SanctionsSource } from './source-interface.js';

// UK Sanctions List CSV — the canonical download from GOV.UK
// This URL may change; the landing page is:
// https://www.gov.uk/government/publications/the-uk-sanctions-list
const UK_SANCTIONS_CSV_URL = 'https://assets.publishing.service.gov.uk/media/uk-sanctions-list.csv';

// Fallback: OFSI consolidated list CSV (withdrawn Jan 2026 but still downloadable)
const OFSI_CSV_URL = 'https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.csv';

/** Map UK group type to our EntityType */
function mapEntityType(groupType: string): EntityType {
  const t = groupType.trim().toLowerCase();
  if (t === 'individual') return 'person';
  if (t === 'entity' || t === 'ship' || t === 'organisation') return 'entity';
  return 'unknown';
}

/** Check if a string looks like a crypto address */
function isCryptoAddress(value: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) return true;
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(value)) return true;
  if (/^bc1[a-z0-9]{39,59}$/.test(value)) return true;
  return false;
}

/** Parse CSV with proper quote handling */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export class UKSanctionsSource implements SanctionsSource {
  readonly name = 'UK Sanctions List';
  readonly id = 'uk';

  isAvailable(): boolean {
    return true; // Free government data
  }

  async fetch(): Promise<SanctionsEntity[]> {
    let csvText: string;

    try {
      csvText = await fetchText(UK_SANCTIONS_CSV_URL);
    } catch {
      // Fallback to OFSI consolidated list
      csvText = await fetchText(OFSI_CSV_URL);
    }

    return this.parseCSV(csvText);
  }

  private parseCSV(csvText: string): SanctionsEntity[] {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]!);
    const col = (name: string): number => {
      const idx = header.findIndex(h =>
        h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(name.toLowerCase().replace(/[^a-z0-9]/g, '')),
      );
      return idx;
    };

    const nameCol = col('name6') !== -1 ? col('name6') : col('name');
    const typeCol = col('grouptype') !== -1 ? col('grouptype') : col('type');
    const aliasCol = col('alias');
    const regimeCol = col('regime');
    const idCol = col('uniqueid') !== -1 ? col('uniqueid') : col('groupid');

    const entities = new Map<string, SanctionsEntity>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const fields = parseCSVLine(line);
      const id = fields[idCol >= 0 ? idCol : 0]?.trim() ?? String(i);
      const name = fields[nameCol >= 0 ? nameCol : 1]?.trim() ?? '';
      const type = fields[typeCol >= 0 ? typeCol : 2]?.trim() ?? '';
      const regime = fields[regimeCol >= 0 ? regimeCol : -1]?.trim() ?? '';

      if (!name) continue;

      // Deduplicate by ID — some entries appear multiple times with different regimes
      const existing = entities.get(id);
      if (existing) {
        if (regime && !existing.programs.includes(regime)) {
          existing.programs.push(regime);
        }
        continue;
      }

      // Collect aliases from alias columns
      const aliases: string[] = [];
      if (aliasCol >= 0) {
        // UK Sanctions List may have multiple alias columns (Name 1..6, AKA)
        for (let j = aliasCol; j < fields.length; j++) {
          const val = fields[j]?.trim();
          if (val && val !== name && !aliases.includes(val)) {
            aliases.push(val);
          }
        }
      }

      // Check all fields for crypto addresses
      const cryptoAddresses: string[] = [];
      for (const field of fields) {
        const trimmed = field?.trim() ?? '';
        if (isCryptoAddress(trimmed)) {
          cryptoAddresses.push(trimmed.toLowerCase());
        }
      }

      entities.set(id, {
        id: `uk:${id}`,
        name,
        aliases: aliases.slice(0, 50), // Cap aliases to prevent bloat
        type: mapEntityType(type),
        cryptoAddresses,
        lists: ['UK_OFSI'],
        programs: regime ? [regime] : [],
        status: 'active',
        sourceIds: { uk: id },
      });
    }

    return Array.from(entities.values());
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}
