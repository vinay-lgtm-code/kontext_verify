// ============================================================================
// Kontext Server - EU Financial Sanctions (FSF) Source
// ============================================================================
//
// Downloads and parses the EU Consolidated Financial Sanctions list.
// Uses the CSV format from the European Commission's FSF system.
//
// Available at a stable URL with a static token (public access).
//

import type { SanctionsEntity, EntityType } from '../types.js';
import type { SanctionsSource } from './source-interface.js';

// EU FSF CSV — public download, updated daily
const EU_FSF_CSV_URL = 'https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw';

/** Map EU subject type to our EntityType */
function mapEntityType(subjectType: string): EntityType {
  const t = subjectType.trim().toLowerCase();
  if (t === 'person' || t === 'p') return 'person';
  if (t === 'enterprise' || t === 'entity' || t === 'e') return 'entity';
  return 'unknown';
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
    } else if (ch === ';' && !inQuotes) {
      // EU FSF uses semicolon delimiter
      fields.push(current.trim());
      current = '';
    } else if (ch === ',' && !inQuotes) {
      // Fallback: some exports use comma
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export class EUFSFSource implements SanctionsSource {
  readonly name = 'EU Financial Sanctions';
  readonly id = 'eu';

  isAvailable(): boolean {
    return true; // Free government data
  }

  async fetch(): Promise<SanctionsEntity[]> {
    const csvText = await fetchText(EU_FSF_CSV_URL);
    return this.parseCSV(csvText);
  }

  private parseCSV(csvText: string): SanctionsEntity[] {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    // Detect delimiter from first line
    const headerLine = lines[0]!;
    const delimiter = headerLine.includes(';') ? ';' : ',';

    // Re-parse with correct delimiter
    const header = delimiter === ';'
      ? headerLine.split(';').map(h => h.trim().replace(/^"|"$/g, ''))
      : parseCSVLine(headerLine);

    const col = (name: string): number => {
      return header.findIndex(h =>
        h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(name.toLowerCase().replace(/[^a-z0-9]/g, '')),
      );
    };

    // EU FSF CSV columns typically include:
    // Entity_LogicalId, Entity_SubjectType, Entity_Regulation, NameAlias_WholeName, etc.
    const logicalIdCol = col('logicalid');
    const subjectTypeCol = col('subjecttype');
    const regulationCol = col('regulation');
    const wholeNameCol = col('wholename');
    const lastNameCol = col('lastname');
    const firstNameCol = col('firstname');

    const entities = new Map<string, SanctionsEntity>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const fields = delimiter === ';'
        ? line.split(';').map(f => f.trim().replace(/^"|"$/g, ''))
        : parseCSVLine(line);

      const logicalId = fields[logicalIdCol >= 0 ? logicalIdCol : 0]?.trim() ?? '';
      const subjectType = fields[subjectTypeCol >= 0 ? subjectTypeCol : 1]?.trim() ?? '';
      const regulation = fields[regulationCol >= 0 ? regulationCol : 2]?.trim() ?? '';

      // Build name from WholeName or LastName + FirstName
      let name = '';
      if (wholeNameCol >= 0) {
        name = fields[wholeNameCol]?.trim() ?? '';
      }
      if (!name && lastNameCol >= 0) {
        const last = fields[lastNameCol]?.trim() ?? '';
        const first = firstNameCol >= 0 ? (fields[firstNameCol]?.trim() ?? '') : '';
        name = first ? `${first} ${last}` : last;
      }

      if (!logicalId || !name) continue;

      // Group by logical ID — multiple rows per entity (one per alias/regulation)
      const existing = entities.get(logicalId);
      if (existing) {
        // Add as alias if different from primary name
        if (name !== existing.name && !existing.aliases.includes(name)) {
          existing.aliases.push(name);
        }
        if (regulation && !existing.programs.includes(regulation)) {
          existing.programs.push(regulation);
        }
        continue;
      }

      entities.set(logicalId, {
        id: `eu:${logicalId}`,
        name,
        aliases: [],
        type: mapEntityType(subjectType),
        cryptoAddresses: [], // EU FSF rarely includes crypto addresses
        lists: ['EU_CONSOLIDATED'],
        programs: regulation ? [regulation] : [],
        status: 'active',
        sourceIds: { eu: logicalId },
      });
    }

    return Array.from(entities.values());
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch EU FSF: ${res.status} ${res.statusText}`);
  }
  return res.text();
}
