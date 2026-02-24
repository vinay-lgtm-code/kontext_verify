// ============================================================================
// kontext sync — fetch latest OFAC SDN list from U.S. Treasury
// ============================================================================
//
// Two modes:
//   --full    Download the complete SDN XML (~50MB), parse ALL sanctioned
//             entities (names, programs, identifiers) AND all digital currency
//             addresses. One-time bootstrap to populate GCS as persistent
//             baseline. Covers fiat + crypto sanctions.
//
//   (default) Fast per-program fetch of ETH addresses from 7 crypto-relevant
//             programs. Diffs against the GCS baseline (or local cache).
//
// Persistent storage:
//   1. Always write to local file cache (.kontext/ofac-sdn-cache.json)
//   2. If GCP config is set, read/write from Cloud Storage (GCS)
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const SLS_BASE = 'https://sanctionslistservice.ofac.treas.gov';
const ETH_REGEX = /0x[a-fA-F0-9]{40}/g;

// Standard SDN XML — has entity names, programs, AND crypto addresses
const SDN_XML_URL = 'https://www.treasury.gov/ofac/downloads/sdn.xml';

// Sanctions programs known to contain crypto/ETH addresses.
const CRYPTO_PROGRAMS = [
  'CYBER2',                 // Ransomware, crypto laundering
  'DPRK3',                  // Lazarus Group / DPRK cyber ops
  'DPRK4',                  // DPRK additional
  'SDGT',                   // Terrorism financing (some use crypto)
  'ILLICIT-DRUGS-EO14059',  // Narcotics (some use crypto)
  'IRGC',                   // Iran Revolutionary Guard
  'RUSSIA-EO14024',         // Russia sanctions (Garantex)
];

// ============================================================================
// Types
// ============================================================================

/** A digital currency address with metadata from the SDN list */
export interface SDNAddress {
  address: string;
  currency: string;       // ETH, XBT, SOL, USDC, etc.
  entityName: string;
  entityType: string;     // individual, entity
  sdnUid: string;
  chains: string[];       // ethereum, base, solana, etc.
}

/** A non-crypto identifier (passport, national ID, etc.) */
export interface SDNIdentifier {
  type: string;           // Passport, National Identification Number, etc.
  value: string;
  country: string;
}

/** A full SDN entity with all metadata */
export interface SDNEntity {
  uid: string;
  name: string;
  aliases: string[];
  type: string;           // individual, entity, vessel, aircraft
  programs: string[];
  identifiers: SDNIdentifier[];
  digitalCurrencyAddresses: SDNAddress[];
  remarks: string;
}

export interface SyncResult {
  addresses: string[];
  count: number;
  syncedAt: string;
  source: string;
  programs: string[];
}

interface FullSyncData {
  entities: SDNEntity[];
  addresses: SDNAddress[];
  addressList: string[];
  syncedAt: string;
  source: string;
  stats: {
    totalEntities: number;
    entitiesWithCrypto: number;
    uniqueAddresses: number;
    currencyCounts: Record<string, number>;
    entityTypeCounts: Record<string, number>;
  };
}

interface SyncArgs {
  json: boolean;
  full: boolean;
}

// ============================================================================
// Address classification and chain mapping
// ============================================================================

const EVM_CHAINS = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'arc'];

const CURRENCY_TO_CHAINS: Record<string, string[]> = {
  ETH: EVM_CHAINS,
  ARB: EVM_CHAINS,
  MATIC: EVM_CHAINS,
  OP: EVM_CHAINS,
  AVAX: EVM_CHAINS,
  BASE: EVM_CHAINS,
  SOL: ['solana'],
  USDC: EVM_CHAINS,
  USDT: EVM_CHAINS,
  DAI: EVM_CHAINS,
  EURC: EVM_CHAINS,
  XBT: ['bitcoin'],
  BTC: ['bitcoin'],
};

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BTC_ADDRESS_REGEX = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/;

function classifyAddress(address: string): 'evm' | 'solana' | 'bitcoin' | null {
  if (EVM_ADDRESS_REGEX.test(address)) return 'evm';
  if (SOLANA_ADDRESS_REGEX.test(address)) return 'solana';
  if (BTC_ADDRESS_REGEX.test(address)) return 'bitcoin';
  return null;
}

function normalizeAddress(address: string, type: string): string {
  if (type === 'evm') return address.toLowerCase();
  return address; // SOL and BTC are case-sensitive
}

// ============================================================================
// XML extraction helpers
// ============================================================================

function extractTag(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  return match?.[1]?.trim() ?? null;
}

function extractAllTags(block: string, tag: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = regex.exec(block)) !== null) {
    const val = m[1]?.trim();
    if (val) results.push(val);
  }
  return results;
}

// ============================================================================
// Fast mode — per-program ETH-only fetch
// ============================================================================

async function fetchProgramAddresses(program: string): Promise<string[]> {
  const url = `${SLS_BASE}/entities?list=SDN%20List&program=${encodeURIComponent(program)}`;
  const response = await fetch(url, {
    headers: { accept: '*/*' },
  });

  if (!response.ok) return [];

  const xml = await response.text();
  const matches = xml.match(ETH_REGEX);
  if (!matches) return [];

  return matches.map((addr) => addr.toLowerCase());
}

async function fetchSDNAddresses(): Promise<{ addresses: string[]; programs: string[] }> {
  const allAddresses = new Set<string>();
  const activePrograms: string[] = [];

  const results = await Promise.all(
    CRYPTO_PROGRAMS.map(async (prog) => {
      const addrs = await fetchProgramAddresses(prog);
      return { program: prog, addresses: addrs };
    }),
  );

  for (const { program, addresses } of results) {
    if (addresses.length > 0) {
      activePrograms.push(program);
      for (const addr of addresses) {
        allAddresses.add(addr);
      }
    }
  }

  return {
    addresses: Array.from(allAddresses).sort(),
    programs: activePrograms,
  };
}

// ============================================================================
// Full mode — download standard SDN XML, parse ALL entities + addresses
// ============================================================================

/**
 * Download the full SDN XML and parse ALL sanctioned entities.
 *
 * The standard SDN XML (~50MB) uses <sdnEntry> blocks with entity names,
 * programs, identifiers, and digital currency addresses:
 *
 *   <sdnEntry>
 *     <uid>12345</uid>
 *     <sdnType>Individual</sdnType>
 *     <firstName>JOHN</firstName>
 *     <lastName>DOE</lastName>
 *     <programList><program>SDGT</program></programList>
 *     <idList>
 *       <id>
 *         <idType>Passport</idType>
 *         <idNumber>AB123456</idNumber>
 *         <idCountry>Iran</idCountry>
 *       </id>
 *       <id>
 *         <idType>Digital Currency Address - ETH</idType>
 *         <idNumber>0x1234...</idNumber>
 *       </id>
 *     </idList>
 *   </sdnEntry>
 */
async function fetchFullSDNList(): Promise<FullSyncData> {
  process.stderr.write('Downloading full OFAC SDN list from U.S. Treasury...\n');

  const response = await fetch(SDN_XML_URL, {
    headers: {
      Accept: 'application/xml',
      'User-Agent': 'Kontext-SDN-Sync/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Treasury endpoint returned HTTP ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  process.stderr.write(`Downloaded ${(xml.length / 1024 / 1024).toFixed(1)}MB. Parsing...\n`);

  const entities: SDNEntity[] = [];
  const allAddresses: SDNAddress[] = [];
  const uniqueAddressSet = new Set<string>();
  const currencyCounts: Record<string, number> = {};
  const entityTypeCounts: Record<string, number> = {};
  let entitiesWithCrypto = 0;

  // Parse all <sdnEntry> blocks
  const entryRegex = /<sdnEntry>([\s\S]*?)<\/sdnEntry>/g;
  let entryMatch: RegExpExecArray | null;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1]!;

    // UID
    const uid = extractTag(block, 'uid');
    if (!uid) continue;

    // Name
    const firstName = extractTag(block, 'firstName') ?? '';
    const lastName = extractTag(block, 'lastName') ?? '';
    const name = firstName ? `${firstName} ${lastName}`.trim() : lastName;

    // Type
    const sdnType = (extractTag(block, 'sdnType') ?? 'unknown').toLowerCase();
    entityTypeCounts[sdnType] = (entityTypeCounts[sdnType] ?? 0) + 1;

    // Programs
    const programListBlock = extractTag(block, 'programList');
    const programs = programListBlock ? extractAllTags(programListBlock, 'program') : [];

    // Aliases
    const aliases: string[] = [];
    const akaListBlock = extractTag(block, 'akaList');
    if (akaListBlock) {
      const akaRegex = /<aka>([\s\S]*?)<\/aka>/g;
      let akaMatch: RegExpExecArray | null;
      while ((akaMatch = akaRegex.exec(akaListBlock)) !== null) {
        const akaBlock = akaMatch[1]!;
        const akaFirst = extractTag(akaBlock, 'firstName') ?? '';
        const akaLast = extractTag(akaBlock, 'lastName') ?? '';
        const alias = akaFirst ? `${akaFirst} ${akaLast}`.trim() : akaLast;
        if (alias && alias !== name) aliases.push(alias);
      }
    }

    // Identifiers and digital currency addresses
    const identifiers: SDNIdentifier[] = [];
    const cryptoAddresses: SDNAddress[] = [];
    const idListBlock = extractTag(block, 'idList');

    if (idListBlock) {
      const idRegex = /<id>([\s\S]*?)<\/id>/g;
      let idMatch: RegExpExecArray | null;

      while ((idMatch = idRegex.exec(idListBlock)) !== null) {
        const idBlock = idMatch[1]!;
        const idType = extractTag(idBlock, 'idType') ?? '';
        const idNumber = extractTag(idBlock, 'idNumber') ?? '';

        if (!idType || !idNumber) continue;

        if (idType.startsWith('Digital Currency Address')) {
          // Crypto address
          const currencyMatch = /Digital Currency Address\s*-\s*(\w+)/.exec(idType);
          const currency = currencyMatch?.[1] ?? 'UNKNOWN';
          const addrType = classifyAddress(idNumber);
          if (!addrType) continue;

          const address = normalizeAddress(idNumber, addrType);
          const chains = CURRENCY_TO_CHAINS[currency] ??
            (addrType === 'evm' ? EVM_CHAINS : addrType === 'solana' ? ['solana'] : ['bitcoin']);

          const sdnAddr: SDNAddress = {
            address,
            currency,
            entityName: name,
            entityType: sdnType,
            sdnUid: uid,
            chains,
          };
          cryptoAddresses.push(sdnAddr);
          allAddresses.push(sdnAddr);
          uniqueAddressSet.add(address);
          currencyCounts[currency] = (currencyCounts[currency] ?? 0) + 1;
        } else {
          // Non-crypto identifier (passport, national ID, etc.)
          const idCountry = extractTag(idBlock, 'idCountry') ?? '';
          identifiers.push({ type: idType, value: idNumber, country: idCountry });
        }
      }
    }

    if (cryptoAddresses.length > 0) entitiesWithCrypto++;

    // Remarks
    const remarks = extractTag(block, 'remarks') ?? '';

    entities.push({
      uid,
      name,
      aliases,
      type: sdnType,
      programs,
      identifiers,
      digitalCurrencyAddresses: cryptoAddresses,
      remarks,
    });
  }

  process.stderr.write(
    `Parsed ${entities.length} entities, ${allAddresses.length} crypto addresses (${uniqueAddressSet.size} unique)\n`,
  );

  return {
    entities,
    addresses: allAddresses,
    addressList: Array.from(uniqueAddressSet).sort(),
    syncedAt: new Date().toISOString(),
    source: SDN_XML_URL,
    stats: {
      totalEntities: entities.length,
      entitiesWithCrypto,
      uniqueAddresses: uniqueAddressSet.size,
      currencyCounts,
      entityTypeCounts,
    },
  };
}

// ============================================================================
// GCS (Cloud Storage) — persistent baseline storage
// ============================================================================

const DEFAULT_GCS_BUCKET = 'kontext-sdn-data';
const GCS_BASELINE_PATH = 'ofac-sdn/baseline.json';
const GCS_ENTITIES_PATH = 'ofac-sdn/entities.json';

interface GcsBaseline {
  addresses: string[];
  entityCount: number;
  syncedAt: string;
  isFullSync: boolean;
}

async function readGcsBaseline(bucket: string): Promise<GcsBaseline | null> {
  const objectPath = encodeURIComponent(GCS_BASELINE_PATH);
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${objectPath}?alt=media`;

  try {
    const token = await getGcpAccessToken();
    if (!token) return null;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json() as GcsBaseline;
  } catch {
    return null;
  }
}

async function writeGcsObject(bucket: string, objectPath: string, data: unknown): Promise<boolean> {
  const encodedPath = encodeURIComponent(objectPath);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodedPath}`;

  try {
    const token = await getGcpAccessToken();
    if (!token) return false;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// GCP Auth — metadata server (Cloud Run) or env var (local dev)
// ============================================================================

const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGcpAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const envToken = process.env['GOOGLE_ACCESS_TOKEN'];
  if (envToken) {
    cachedToken = { token: envToken, expiresAt: Date.now() + 3_600_000 };
    return envToken;
  }

  try {
    const res = await fetch(METADATA_TOKEN_URL, {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token: string; expires_in: number };
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.token;
  } catch {
    return null;
  }
}

// ============================================================================
// Main sync command
// ============================================================================

export async function runSync(args: SyncArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const gcsBucket = process.env['KONTEXT_GCS_BUCKET'] || process.env['GCS_BUCKET'] || DEFAULT_GCS_BUCKET;
  const useGcs = !!(process.env['KONTEXT_GCS_BUCKET'] || process.env['GCS_BUCKET'] || process.env['GCP_PROJECT_ID']);

  fs.mkdirSync(dataDir, { recursive: true });
  const cachePath = path.join(dataDir, 'ofac-sdn-cache.json');

  // -----------------------------------------------------------------------
  // Load previous baseline — GCS first, then local cache fallback
  // -----------------------------------------------------------------------
  let previousAddresses: string[] = [];
  let previousSyncedAt = '';
  let baselineSource = 'none';

  if (useGcs) {
    process.stderr.write('Reading baseline from GCS...\n');
    const gcsBaseline = await readGcsBaseline(gcsBucket);
    if (gcsBaseline && gcsBaseline.addresses.length > 0) {
      previousAddresses = gcsBaseline.addresses;
      previousSyncedAt = gcsBaseline.syncedAt;
      baselineSource = 'gcs';
    }
  }

  if (baselineSource === 'none') {
    try {
      const prev = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      previousAddresses = Array.isArray(prev.addresses) ? prev.addresses : [];
      previousSyncedAt = prev.syncedAt ?? '';
      if (previousAddresses.length > 0) baselineSource = 'local';
    } catch {
      // No previous cache
    }
  }

  // -----------------------------------------------------------------------
  // Fetch — full mode or fast per-program mode
  // -----------------------------------------------------------------------
  if (args.full) {
    await runFullSync(args, dataDir, cachePath, gcsBucket, useGcs, previousAddresses, previousSyncedAt, baselineSource);
  } else {
    await runFastSync(args, cachePath, gcsBucket, useGcs, previousAddresses, previousSyncedAt, baselineSource);
  }
}

// ============================================================================
// Full sync — all entities + all crypto addresses
// ============================================================================

async function runFullSync(
  args: SyncArgs,
  dataDir: string,
  cachePath: string,
  gcsBucket: string,
  useGcs: boolean,
  previousAddresses: string[],
  previousSyncedAt: string,
  baselineSource: string,
): Promise<void> {
  process.stderr.write('Full OFAC SDN sync — all sanctioned entities and digital currency addresses\n');

  let fullData: FullSyncData;
  try {
    fullData = await fetchFullSDNList();
  } catch (err) {
    process.stderr.write(`Full sync failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  // Compute address diff
  const prevSet = new Set(previousAddresses);
  const newSet = new Set(fullData.addressList);
  const added = fullData.addressList.filter((a) => !prevSet.has(a));
  const removed = previousAddresses.filter((a) => !newSet.has(a));

  // Write local cache (slim — just addresses for quick lookup)
  const cacheData: SyncResult = {
    addresses: fullData.addressList,
    count: fullData.addressList.length,
    syncedAt: fullData.syncedAt,
    source: fullData.source,
    programs: [],
  };
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');

  // Write full entity data to separate local file
  const fullPath = path.join(dataDir, 'ofac-sdn-full.json');
  fs.writeFileSync(fullPath, JSON.stringify({
    fetchedAt: fullData.syncedAt,
    source: fullData.source,
    stats: fullData.stats,
    entities: fullData.entities,
  }, null, 2), 'utf-8');
  process.stderr.write(`Full entity list saved to ${fullPath}\n`);

  // Upload to GCS
  let gcsUpdated = false;
  if (useGcs) {
    process.stderr.write('Uploading to GCS...\n');

    // Baseline (slim — for diff checking)
    const baselineOk = await writeGcsObject(gcsBucket, GCS_BASELINE_PATH, {
      addresses: fullData.addressList,
      entityCount: fullData.stats.totalEntities,
      syncedAt: fullData.syncedAt,
      isFullSync: true,
    } satisfies GcsBaseline);

    // Full entity data
    const entitiesOk = await writeGcsObject(gcsBucket, GCS_ENTITIES_PATH, {
      fetchedAt: fullData.syncedAt,
      source: fullData.source,
      stats: fullData.stats,
      entities: fullData.entities,
    });

    gcsUpdated = baselineOk && entitiesOk;
    if (!gcsUpdated) {
      process.stderr.write('GCS upload failed — local cache saved\n');
    }
  }

  // Build currency breakdown for display
  const currencyBreakdown = Object.entries(fullData.stats.currencyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const entityTypeBreakdown = Object.entries(fullData.stats.entityTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  // Output
  if (args.json) {
    process.stdout.write(JSON.stringify({
      ...cacheData,
      stats: fullData.stats,
      diff: { added, removed },
      storage: {
        local: cachePath,
        gcs: gcsUpdated ? `gs://${gcsBucket}/${GCS_ENTITIES_PATH}` : null,
        baselineSource,
      },
    }, null, 2) + '\n');
  } else {
    process.stdout.write(`OFAC SDN sync complete (FULL)\n`);
    process.stdout.write(`Total sanctioned entities: ${fullData.stats.totalEntities}\n`);
    process.stdout.write(`Entity types:      ${entityTypeBreakdown}\n`);
    process.stdout.write(`Crypto addresses:  ${fullData.stats.uniqueAddresses} unique`);
    if (previousAddresses.length > 0 && previousAddresses.length !== fullData.stats.uniqueAddresses) {
      const diff = fullData.stats.uniqueAddresses - previousAddresses.length;
      process.stdout.write(` (${diff > 0 ? '+' : ''}${diff} since last sync)`);
    }
    process.stdout.write('\n');
    if (currencyBreakdown) {
      process.stdout.write(`By currency:       ${currencyBreakdown}\n`);
    }
    if (added.length > 0) {
      process.stdout.write(`Added addresses (${added.length}):\n`);
      for (const addr of added) {
        process.stdout.write(`  + ${addr}\n`);
      }
    }
    if (removed.length > 0) {
      process.stdout.write(`Removed addresses (${removed.length}):\n`);
      for (const addr of removed) {
        process.stdout.write(`  - ${addr}\n`);
      }
    }
    if (added.length === 0 && removed.length === 0 && previousAddresses.length > 0) {
      process.stdout.write(`No address changes since last sync`);
      if (previousSyncedAt) process.stdout.write(` (${previousSyncedAt})`);
      process.stdout.write('\n');
    }
    process.stdout.write(`Cached to:         ${cachePath}\n`);
    process.stdout.write(`Full list:         ${path.join(dataDir, 'ofac-sdn-full.json')}\n`);
    if (useGcs) {
      process.stdout.write(`GCS:               ${gcsUpdated ? `gs://${gcsBucket}/${GCS_ENTITIES_PATH}` : 'unavailable'}\n`);
      process.stdout.write(`Baseline from:     ${baselineSource}\n`);
    }
    process.stdout.write(`Source:            ${fullData.source}\n`);
    process.stdout.write(`Synced at:         ${fullData.syncedAt}\n`);
  }
}

// ============================================================================
// Fast sync — per-program ETH addresses only
// ============================================================================

async function runFastSync(
  args: SyncArgs,
  cachePath: string,
  gcsBucket: string,
  useGcs: boolean,
  previousAddresses: string[],
  previousSyncedAt: string,
  baselineSource: string,
): Promise<void> {
  process.stderr.write('Fetching OFAC SDN list from U.S. Treasury...\n');

  let result: { addresses: string[]; programs: string[] };
  try {
    result = await fetchSDNAddresses();
  } catch (err) {
    process.stderr.write(`Sync failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  const syncData: SyncResult = {
    addresses: result.addresses,
    count: result.addresses.length,
    syncedAt: new Date().toISOString(),
    source: `${SLS_BASE} (programs: ${result.programs.join(', ')})`,
    programs: result.programs,
  };

  // Compute diff
  const prevSet = new Set(previousAddresses);
  const newSet = new Set(syncData.addresses);
  const added = syncData.addresses.filter((a) => !prevSet.has(a));
  const removed = previousAddresses.filter((a) => !newSet.has(a));
  const hasChanges = added.length > 0 || removed.length > 0;

  // Write local cache
  fs.writeFileSync(cachePath, JSON.stringify(syncData, null, 2), 'utf-8');

  // Update GCS baseline if there are changes
  let gcsUpdated = false;
  if (useGcs && (hasChanges || baselineSource !== 'gcs')) {
    process.stderr.write('Updating GCS baseline...\n');
    gcsUpdated = await writeGcsObject(gcsBucket, GCS_BASELINE_PATH, {
      addresses: syncData.addresses,
      entityCount: 0,
      syncedAt: syncData.syncedAt,
      isFullSync: false,
    } satisfies GcsBaseline);
    if (!gcsUpdated) {
      process.stderr.write('GCS update failed — local cache saved\n');
    }
  }

  // Output
  if (args.json) {
    process.stdout.write(JSON.stringify({
      ...syncData,
      diff: { added, removed },
      storage: {
        local: cachePath,
        gcs: gcsUpdated ? `gs://${gcsBucket}/${GCS_BASELINE_PATH}` : null,
        baselineSource,
      },
    }, null, 2) + '\n');
  } else {
    process.stdout.write(`OFAC SDN sync complete\n`);
    process.stdout.write(`Digital currency addresses: ${syncData.count}`);
    if (previousAddresses.length > 0 && previousAddresses.length !== syncData.count) {
      const diff = syncData.count - previousAddresses.length;
      process.stdout.write(` (${diff > 0 ? '+' : ''}${diff} since last sync)`);
    }
    process.stdout.write('\n');
    if (added.length > 0) {
      process.stdout.write(`Added (${added.length}):\n`);
      for (const addr of added) {
        process.stdout.write(`  + ${addr}\n`);
      }
    }
    if (removed.length > 0) {
      process.stdout.write(`Removed (${removed.length}):\n`);
      for (const addr of removed) {
        process.stdout.write(`  - ${addr}\n`);
      }
    }
    if (added.length === 0 && removed.length === 0 && previousAddresses.length > 0) {
      process.stdout.write(`No changes since last sync`);
      if (previousSyncedAt) process.stdout.write(` (${previousSyncedAt})`);
      process.stdout.write('\n');
    }
    process.stdout.write(`Programs:      ${result.programs.join(', ')}\n`);
    process.stdout.write(`Cached to:     ${cachePath}\n`);
    if (useGcs) {
      process.stdout.write(`GCS:           ${gcsUpdated ? 'updated' : 'unavailable'}\n`);
      process.stdout.write(`Baseline from: ${baselineSource}\n`);
    }
    process.stdout.write(`Source:        U.S. Treasury OFAC SLS API\n`);
    process.stdout.write(`Synced at:     ${syncData.syncedAt}\n`);
  }
}
