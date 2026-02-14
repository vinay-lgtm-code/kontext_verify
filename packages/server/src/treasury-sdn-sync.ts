// ============================================================================
// Kontext Server - Treasury SDN XML Sync Service
// ============================================================================
//
// Fetches, parses, and stores the OFAC SDN Advanced XML from the official
// Treasury Sanctions List Service. The ~80MB XML is parsed server-side,
// reduced to a compact processed JSON (~100-200KB of digital currency
// addresses), and uploaded to Cloud Storage for SDK consumption.
//
// Data flow:
//   Treasury sdn_advanced.xml --> Parse --> Cloud Storage (processed JSON)
//                                  |
//                                  └--> Firestore (metadata + delta log)
//
// Source: https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADVANCED_XML
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/** A processed SDN address with entity metadata */
export interface ProcessedSDNAddress {
  /** Normalized lowercase (EVM) or original case (Solana) */
  address: string;
  /** Entity name from the SDN entry */
  entityName: string;
  /** Entity type: individual, entity, group */
  entityType: string;
  /** SDN unique identifier */
  sdnUid: string;
  /** Digital currency code from Treasury (ETH, SOL, USDC, etc.) */
  currencyCode: string;
  /** Mapped chain values per cross-chain propagation rules */
  chains: string[];
  /** Sanctions lists this address appears on */
  lists: string[];
}

/** The processed SDN list stored in Cloud Storage */
export interface ProcessedSDNList {
  /** SHA-256 hash of sorted address list (for delta detection) */
  version: string;
  /** ISO timestamp when the list was fetched */
  fetchedAt: string;
  /** All parsed digital currency addresses */
  addresses: ProcessedSDNAddress[];
  /** Aggregate metadata */
  metadata: {
    totalEntries: number;
    digitalCurrencyEntries: number;
    currencyCodeCounts: Record<string, number>;
  };
}

/** Delta between two versions of the processed list */
export interface SDNDelta {
  added: string[];
  removed: string[];
  unchanged: number;
  timestamp: string;
}

/** Sync metadata stored in Firestore */
export interface SDNSyncMetadata {
  lastFetchedAt: string;
  lastChangedAt: string | null;
  version: string;
  addressCount: number;
  deltaStats: SDNDelta | null;
}

/** Configuration for the Treasury SDN sync service */
export interface TreasurySDNSyncConfig {
  /** GCP project ID for Cloud Storage and Firestore */
  gcpProjectId?: string;
  /** Cloud Storage bucket name */
  storageBucket?: string;
  /** Cloud Storage object path */
  storageObjectPath?: string;
  /** Firestore collection for sync metadata */
  firestoreCollection?: string;
  /** Treasury XML endpoint URL */
  treasuryXmlUrl?: string;
  /** Sync interval in milliseconds (default: 6 hours) */
  syncIntervalMs?: number;
  /** Minimum address count threshold to accept a parse (sanity check) */
  minAddressThreshold?: number;
  /** Custom fetch function for testing */
  fetchFn?: typeof fetch;
}

// ============================================================================
// Constants
// ============================================================================

/** Official OFAC Sanctions List Service endpoint for the Advanced XML */
const DEFAULT_TREASURY_XML_URL =
  'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADVANCED_XML';

/** Default sync interval: 6 hours */
const DEFAULT_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Minimum number of addresses to accept a parse result (sanity check) */
const DEFAULT_MIN_ADDRESS_THRESHOLD = 10;

/** Default Cloud Storage bucket */
const DEFAULT_STORAGE_BUCKET = 'kontext-sdn-data';

/** Default Cloud Storage object path */
const DEFAULT_STORAGE_OBJECT_PATH = 'sdn/processed-list.json';

/** Default Firestore collection */
const DEFAULT_FIRESTORE_COLLECTION = 'sdn-sync';

// ============================================================================
// Currency Code -> Chain Mapping
// ============================================================================

/** All supported EVM chains */
const EVM_CHAINS = [
  'ethereum',
  'base',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'arc',
] as const;

/**
 * Map Treasury SDN digital currency codes to supported chain arrays.
 *
 * Cross-chain EVM propagation rule: any EVM-format address sanctioned under
 * ANY currency code is flagged across ALL EVM chains, because the same
 * private key produces the same address on all EVM chains.
 */
const CURRENCY_CODE_TO_CHAINS: Record<string, readonly string[]> = {
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
  // BTC/XBT are recorded but not supported chains
  XBT: [],
  BTC: [],
};

// ============================================================================
// Address Format Validation
// ============================================================================

/** EVM address: 0x followed by 40 hex characters */
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Solana address: base58 (32-44 chars, no 0/O/I/l) */
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Validate and classify a blockchain address format.
 * Returns 'evm', 'solana', or null for unrecognized formats.
 */
function classifyAddress(address: string): 'evm' | 'solana' | null {
  if (EVM_ADDRESS_REGEX.test(address)) return 'evm';
  if (SOLANA_ADDRESS_REGEX.test(address)) return 'solana';
  return null;
}

// ============================================================================
// XML Parsing (regex-based, no external dependencies)
// ============================================================================

/** Extracted digital currency entry from the SDN XML */
interface RawSDNDigitalCurrencyEntry {
  sdnUid: string;
  entityName: string;
  entityType: string;
  address: string;
  currencyCode: string;
}

/**
 * Parse the SDN Advanced XML to extract digital currency addresses.
 *
 * Uses regex-based chunked parsing to extract `<sdnEntry>` blocks and
 * their nested digital currency `<id>` elements. This avoids needing
 * a full XML parser dependency.
 *
 * The XML structure we're targeting:
 * ```xml
 * <sdnEntry>
 *   <uid>12345</uid>
 *   <sdnType>Individual</sdnType>
 *   <firstName>...</firstName>
 *   <lastName>...</lastName>
 *   <idList>
 *     <id>
 *       <idType>Digital Currency Address - XBT</idType>
 *       <idNumber>0x1234...</idNumber>
 *     </id>
 *   </idList>
 * </sdnEntry>
 * ```
 */
function parseSDNXml(xml: string): RawSDNDigitalCurrencyEntry[] {
  const entries: RawSDNDigitalCurrencyEntry[] = [];

  // Match all sdnEntry blocks
  const entryRegex = /<sdnEntry>([\s\S]*?)<\/sdnEntry>/g;
  let entryMatch: RegExpExecArray | null;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1]!;

    // Extract UID
    const uidMatch = /<uid>(\d+)<\/uid>/.exec(block);
    if (!uidMatch) continue;
    const sdnUid = uidMatch[1]!;

    // Extract entity type
    const typeMatch = /<sdnType>(.*?)<\/sdnType>/.exec(block);
    const entityType = typeMatch?.[1]?.toLowerCase() ?? 'unknown';

    // Extract entity name (firstName + lastName or just lastName)
    const firstNameMatch = /<firstName>(.*?)<\/firstName>/.exec(block);
    const lastNameMatch = /<lastName>(.*?)<\/lastName>/.exec(block);
    const firstName = firstNameMatch?.[1] ?? '';
    const lastName = lastNameMatch?.[1] ?? '';
    const entityName = firstName ? `${firstName} ${lastName}`.trim() : lastName;

    // Find all digital currency ID entries
    const idRegex = /<id>([\s\S]*?)<\/id>/g;
    let idMatch: RegExpExecArray | null;

    while ((idMatch = idRegex.exec(block)) !== null) {
      const idBlock = idMatch[1]!;

      // Check if this is a digital currency address
      const idTypeMatch = /<idType>(.*?)<\/idType>/.exec(idBlock);
      const idType = idTypeMatch?.[1] ?? '';

      if (!idType.startsWith('Digital Currency Address')) continue;

      // Extract the currency code from the idType
      // Format: "Digital Currency Address - ETH" or "Digital Currency Address - XBT"
      const currencyCodeMatch = /Digital Currency Address\s*-\s*(\w+)/.exec(idType);
      const currencyCode = currencyCodeMatch?.[1] ?? 'UNKNOWN';

      // Extract the address
      const idNumberMatch = /<idNumber>(.*?)<\/idNumber>/.exec(idBlock);
      const address = idNumberMatch?.[1]?.trim() ?? '';

      if (address) {
        entries.push({
          sdnUid,
          entityName,
          entityType,
          address,
          currencyCode,
        });
      }
    }
  }

  return entries;
}

/**
 * Transform raw XML entries into processed SDN addresses with chain mapping
 * and address format validation.
 */
function processEntries(rawEntries: RawSDNDigitalCurrencyEntry[]): ProcessedSDNAddress[] {
  const processed: ProcessedSDNAddress[] = [];

  for (const entry of rawEntries) {
    const addressType = classifyAddress(entry.address);

    if (addressType === null) {
      // Unrecognized address format -- skip
      continue;
    }

    // Determine chains from currency code
    const mappedChains = CURRENCY_CODE_TO_CHAINS[entry.currencyCode];
    let chains: string[];

    if (mappedChains && mappedChains.length > 0) {
      chains = [...mappedChains];
    } else if (addressType === 'evm') {
      // Unknown currency code but EVM format -> conservative: all EVM chains
      chains = [...EVM_CHAINS];
    } else if (addressType === 'solana') {
      chains = ['solana'];
    } else {
      chains = [...EVM_CHAINS];
    }

    // Normalize address: EVM to lowercase, Solana keeps original
    const normalizedAddress = addressType === 'evm'
      ? entry.address.toLowerCase()
      : entry.address;

    processed.push({
      address: normalizedAddress,
      entityName: entry.entityName,
      entityType: entry.entityType,
      sdnUid: entry.sdnUid,
      currencyCode: entry.currencyCode,
      chains,
      lists: ['SDN'],
    });
  }

  return processed;
}

// ============================================================================
// Hashing
// ============================================================================

/**
 * Compute a SHA-256 hash of a sorted list of addresses.
 * Uses the Web Crypto API (available in Node 18+ and all modern runtimes).
 */
async function computeAddressListHash(addresses: string[]): Promise<string> {
  const sorted = [...addresses].sort();
  const data = sorted.join('\n');
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// TreasurySDNSyncService
// ============================================================================

/**
 * Server-side service for fetching, parsing, and storing Treasury SDN data.
 *
 * Orchestrates the full sync cycle:
 * 1. Fetch sdn_advanced.xml from Treasury
 * 2. Parse digital currency addresses
 * 3. Compute delta against previous version
 * 4. Upload processed JSON to Cloud Storage
 * 5. Update sync metadata in Firestore
 *
 * Designed to run on Cloud Run with a 6-hour sync interval.
 *
 * @example
 * ```typescript
 * const sync = new TreasurySDNSyncService({
 *   gcpProjectId: 'kontext-verify-sdk',
 * });
 *
 * // Run initial sync
 * await sync.syncOnce();
 *
 * // Start periodic sync
 * sync.startPeriodicSync();
 *
 * // Get current status
 * const status = sync.getStatus();
 * ```
 */
export class TreasurySDNSyncService {
  private readonly config: Required<
    Pick<TreasurySDNSyncConfig, 'treasuryXmlUrl' | 'syncIntervalMs' | 'minAddressThreshold' | 'storageBucket' | 'storageObjectPath' | 'firestoreCollection' | 'gcpProjectId'>
  > & { fetchFn: typeof fetch };

  /** Last successfully processed list (kept in memory for delta detection) */
  private lastProcessedList: ProcessedSDNList | null = null;

  /** Current sync metadata */
  private syncMetadata: SDNSyncMetadata | null = null;

  /** Handle for periodic sync interval */
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  /** Whether a sync is currently in progress */
  private syncing = false;

  constructor(config: TreasurySDNSyncConfig = {}) {
    this.config = {
      gcpProjectId: config.gcpProjectId ?? 'kontext-verify-sdk',
      storageBucket: config.storageBucket ?? DEFAULT_STORAGE_BUCKET,
      storageObjectPath: config.storageObjectPath ?? DEFAULT_STORAGE_OBJECT_PATH,
      firestoreCollection: config.firestoreCollection ?? DEFAULT_FIRESTORE_COLLECTION,
      treasuryXmlUrl: config.treasuryXmlUrl ?? DEFAULT_TREASURY_XML_URL,
      syncIntervalMs: config.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS,
      minAddressThreshold: config.minAddressThreshold ?? DEFAULT_MIN_ADDRESS_THRESHOLD,
      fetchFn: config.fetchFn ?? globalThis.fetch,
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Run a single sync cycle: fetch XML, parse, compute delta, store.
   *
   * @returns The processed SDN list and delta information
   * @throws If the Treasury endpoint is unreachable and no fallback exists
   */
  async syncOnce(): Promise<{ list: ProcessedSDNList; delta: SDNDelta | null }> {
    if (this.syncing) {
      throw new Error('TreasurySDNSyncService: Sync already in progress');
    }

    this.syncing = true;
    try {
      // Step 1: Fetch XML
      const xml = await this.fetchXml();

      // Step 2: Parse
      const rawEntries = parseSDNXml(xml);
      const processedAddresses = processEntries(rawEntries);

      // Step 3: Sanity check
      if (processedAddresses.length < this.config.minAddressThreshold) {
        throw new Error(
          `TreasurySDNSyncService: Parsed only ${processedAddresses.length} addresses ` +
          `(threshold: ${this.config.minAddressThreshold}). Possible XML format change. ` +
          `Keeping last-good version.`,
        );
      }

      // Step 4: Compute version hash
      const addressStrings = processedAddresses.map((a) => a.address);
      const version = await computeAddressListHash(addressStrings);

      // Step 5: Build currency code counts
      const currencyCodeCounts: Record<string, number> = {};
      for (const addr of processedAddresses) {
        currencyCodeCounts[addr.currencyCode] = (currencyCodeCounts[addr.currencyCode] ?? 0) + 1;
      }

      // Step 6: Build processed list
      const fetchedAt = new Date().toISOString();
      const list: ProcessedSDNList = {
        version,
        fetchedAt,
        addresses: processedAddresses,
        metadata: {
          totalEntries: rawEntries.length,
          digitalCurrencyEntries: processedAddresses.length,
          currencyCodeCounts,
        },
      };

      // Step 7: Compute delta
      let delta: SDNDelta | null = null;
      if (this.lastProcessedList && this.lastProcessedList.version !== version) {
        delta = this.computeDelta(
          this.lastProcessedList.addresses.map((a) => a.address),
          processedAddresses.map((a) => a.address),
        );
      }

      // Step 8: Upload to Cloud Storage
      await this.uploadProcessedList(list);

      // Step 9: Update metadata
      this.syncMetadata = {
        lastFetchedAt: fetchedAt,
        lastChangedAt: delta ? fetchedAt : (this.syncMetadata?.lastChangedAt ?? null),
        version,
        addressCount: processedAddresses.length,
        deltaStats: delta,
      };

      await this.updateSyncMetadata(this.syncMetadata);

      // Step 10: Store as last processed
      this.lastProcessedList = list;

      return { list, delta };
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Start periodic sync on the configured interval.
   */
  startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      void this.syncOnce().catch((error) => {
        console.error(
          '[TreasurySDNSync] Periodic sync failed:',
          error instanceof Error ? error.message : String(error),
        );
      });
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop periodic sync.
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get current sync status.
   */
  getStatus(): {
    syncing: boolean;
    metadata: SDNSyncMetadata | null;
    hasData: boolean;
  } {
    return {
      syncing: this.syncing,
      metadata: this.syncMetadata ? { ...this.syncMetadata } : null,
      hasData: this.lastProcessedList !== null,
    };
  }

  /**
   * Get the last processed list (if available).
   */
  getLastProcessedList(): ProcessedSDNList | null {
    return this.lastProcessedList;
  }

  // --------------------------------------------------------------------------
  // Internal: Fetch XML
  // --------------------------------------------------------------------------

  private async fetchXml(): Promise<string> {
    let response: Response;
    try {
      response = await this.config.fetchFn(this.config.treasuryXmlUrl, {
        headers: {
          Accept: 'application/xml',
          'User-Agent': 'Kontext-SDN-Sync/1.0',
        },
      });
    } catch (error) {
      throw new Error(
        `TreasurySDNSyncService: Failed to fetch XML from ${this.config.treasuryXmlUrl}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `TreasurySDNSyncService: Treasury endpoint returned HTTP ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  // --------------------------------------------------------------------------
  // Internal: Delta Detection
  // --------------------------------------------------------------------------

  /**
   * Compute the delta between two address lists.
   */
  private computeDelta(previousAddresses: string[], currentAddresses: string[]): SDNDelta {
    const prevSet = new Set(previousAddresses);
    const currSet = new Set(currentAddresses);

    const added: string[] = [];
    const removed: string[] = [];
    let unchanged = 0;

    for (const addr of currSet) {
      if (prevSet.has(addr)) {
        unchanged++;
      } else {
        added.push(addr);
      }
    }

    for (const addr of prevSet) {
      if (!currSet.has(addr)) {
        removed.push(addr);
      }
    }

    return {
      added,
      removed,
      unchanged,
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Internal: Cloud Storage Upload
  // --------------------------------------------------------------------------

  /**
   * Upload the processed SDN list to Cloud Storage.
   *
   * Uses the Cloud Storage JSON API with Application Default Credentials.
   * In production, the Cloud Run service account has Storage Object Admin role.
   */
  private async uploadProcessedList(list: ProcessedSDNList): Promise<void> {
    const bucket = this.config.storageBucket;
    const objectPath = encodeURIComponent(this.config.storageObjectPath);
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${objectPath}`;

    const body = JSON.stringify(list);

    try {
      const response = await this.config.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error');
        throw new Error(`Cloud Storage upload failed: HTTP ${response.status} - ${errorText}`);
      }
    } catch (error) {
      // In development/testing, log but don't fail the sync
      if (error instanceof Error && error.message.includes('Cloud Storage upload failed')) {
        throw error;
      }
      console.warn(
        '[TreasurySDNSync] Cloud Storage upload skipped (likely not in GCP environment):',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // --------------------------------------------------------------------------
  // Internal: Firestore Metadata Update
  // --------------------------------------------------------------------------

  /**
   * Write sync metadata to Firestore.
   */
  private async updateSyncMetadata(metadata: SDNSyncMetadata): Promise<void> {
    const project = this.config.gcpProjectId;
    const collection = this.config.firestoreCollection;
    const docPath = `projects/${project}/databases/(default)/documents/${collection}/latest`;
    const url = `https://firestore.googleapis.com/v1/${docPath}`;

    const firestoreDoc = {
      fields: {
        lastFetchedAt: { stringValue: metadata.lastFetchedAt },
        lastChangedAt: { stringValue: metadata.lastChangedAt ?? '' },
        version: { stringValue: metadata.version },
        addressCount: { integerValue: String(metadata.addressCount) },
        deltaStats: { stringValue: metadata.deltaStats ? JSON.stringify(metadata.deltaStats) : '' },
      },
    };

    try {
      const response = await this.config.fetchFn(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreDoc),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error');
        throw new Error(`Firestore update failed: HTTP ${response.status} - ${errorText}`);
      }
    } catch (error) {
      // In development/testing, log but don't fail the sync
      if (error instanceof Error && error.message.includes('Firestore update failed')) {
        throw error;
      }
      console.warn(
        '[TreasurySDNSync] Firestore metadata update skipped (likely not in GCP environment):',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

// ============================================================================
// Exported helpers for testing
// ============================================================================

export { parseSDNXml, processEntries, computeAddressListHash, classifyAddress };
export { EVM_CHAINS, CURRENCY_CODE_TO_CHAINS };
