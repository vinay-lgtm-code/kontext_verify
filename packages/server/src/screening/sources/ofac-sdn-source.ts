// ============================================================================
// Kontext Server - OFAC SDN Source
// ============================================================================
//
// Downloads and parses the OFAC SDN list from Treasury.gov.
// Uses the simple SDN CSV files (SDN.CSV, ALT.CSV, ADD.CSV) for reliability.
// The Advanced XML has richer data but is 100MB+ and complex to parse.
//
// CSV approach: 3 small files, simple parsing, all the data we need:
// - SDN.CSV: entity names, types, programs
// - ALT.CSV: aliases (alt names linked by ent_num)
// - ADD.CSV: addresses including crypto addresses (Digital Currency type)
//

import type { SanctionsEntity, EntityType } from '../types.js';
import type { SanctionsSource } from './source-interface.js';

const SDN_CSV_URL = 'https://www.treasury.gov/ofac/downloads/sdn.csv';
const ALT_CSV_URL = 'https://www.treasury.gov/ofac/downloads/alt.csv';
const ADD_CSV_URL = 'https://www.treasury.gov/ofac/downloads/add.csv';

/** Parse a simple CSV line (OFAC doesn't use quoted fields with commas) */
function parseCSVLine(line: string): string[] {
  // OFAC CSVs use "field","field" format with quotes
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
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

/** Map SDN_Type to our EntityType */
function mapEntityType(sdnType: string): EntityType {
  const t = sdnType.trim().toLowerCase();
  if (t === 'individual') return 'person';
  if (t === 'entity') return 'entity';
  if (t === 'vessel') return 'vessel';
  if (t === 'aircraft') return 'aircraft';
  return 'unknown';
}

/** Check if an address looks like a crypto address */
function isCryptoAddress(address: string): boolean {
  // Ethereum-style (0x + 40 hex)
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return true;
  // Bitcoin-style (starts with 1, 3, or bc1, 26-62 chars)
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
  if (/^bc1[a-z0-9]{39,59}$/.test(address)) return true;
  return false;
}

export class OFACSDNSource implements SanctionsSource {
  readonly name = 'OFAC SDN';
  readonly id = 'ofac';

  isAvailable(): boolean {
    return true; // Always available — free government data
  }

  async fetch(): Promise<SanctionsEntity[]> {
    // Download all 3 CSV files in parallel
    const [sdnText, altText, addText] = await Promise.all([
      fetchText(SDN_CSV_URL),
      fetchText(ALT_CSV_URL),
      fetchText(ADD_CSV_URL),
    ]);

    // Parse SDN.CSV — primary entities
    // Columns: ent_num, SDN_Name, SDN_Type, Program, Title, Call_Sign, Vess_type, Tonnage, GRT, Vess_flag, Vess_owner, Remarks
    const entities = new Map<string, SanctionsEntity>();
    const sdnLines = sdnText.split('\n').filter(l => l.trim());

    for (const line of sdnLines) {
      const fields = parseCSVLine(line);
      const entNum = fields[0]?.trim();
      const name = fields[1]?.trim();
      const type = fields[2]?.trim() ?? '';
      const program = fields[3]?.trim() ?? '';

      if (!entNum || !name || entNum === '-0-') continue;

      entities.set(entNum, {
        id: `ofac:${entNum}`,
        name,
        aliases: [],
        type: mapEntityType(type),
        cryptoAddresses: [],
        lists: ['OFAC_SDN'],
        programs: program ? program.split(';').map(p => p.trim()).filter(Boolean) : [],
        status: 'active',
        sourceIds: { ofac: entNum },
      });
    }

    // Parse ALT.CSV — aliases
    // Columns: ent_num, alt_num, alt_type, alt_name, alt_remarks
    const altLines = altText.split('\n').filter(l => l.trim());
    for (const line of altLines) {
      const fields = parseCSVLine(line);
      const entNum = fields[0]?.trim();
      const altName = fields[3]?.trim();

      if (!entNum || !altName || entNum === '-0-') continue;

      const entity = entities.get(entNum);
      if (entity && altName !== entity.name) {
        entity.aliases.push(altName);
      }
    }

    // Parse ADD.CSV — addresses (including crypto)
    // Columns: ent_num, add_num, address, city/state/zip, country, add_remarks
    const addLines = addText.split('\n').filter(l => l.trim());
    for (const line of addLines) {
      const fields = parseCSVLine(line);
      const entNum = fields[0]?.trim();
      const address = fields[2]?.trim() ?? '';
      const remarks = fields[5]?.trim() ?? '';

      if (!entNum || entNum === '-0-') continue;

      const entity = entities.get(entNum);
      if (!entity) continue;

      // Check if this is a Digital Currency Address
      // OFAC marks them in remarks or the address itself looks like a crypto address
      const isDigitalCurrency = remarks.toLowerCase().includes('digital currency') ||
        remarks.toLowerCase().includes('virtual currency') ||
        isCryptoAddress(address);

      if (isDigitalCurrency && address) {
        // Some entries have "Digital Currency Address - " prefix
        const cleanAddr = address
          .replace(/^Digital Currency Address\s*[-–—]\s*/i, '')
          .replace(/^XBT\s*/i, '')
          .replace(/^ETH\s*/i, '')
          .replace(/^USDT\s*/i, '')
          .trim();

        if (cleanAddr && isCryptoAddress(cleanAddr)) {
          entity.cryptoAddresses.push(cleanAddr.toLowerCase());
        }
      }
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
