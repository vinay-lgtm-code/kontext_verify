// ============================================================================
// Kontext SDK - Screening Provider Interface & Types
// ============================================================================
//
// Unified interface for sanctions screening providers. Supports both
// blockchain address and entity name queries via the `queryTypes` field.
// Providers declare what query types they handle; the ScreeningAggregator
// auto-detects the query type and routes to compatible providers.
//

import type { Chain, Token } from '../types.js';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** What kind of queries a provider can handle */
export type QueryType = 'address' | 'entity_name' | 'both';

/** Jurisdictions for sanctions list mapping */
export type Jurisdiction =
  | 'US' | 'EU' | 'UK' | 'UN'
  | 'UAE' | 'SG' | 'HK' | 'IN'
  | 'KR' | 'MY' | 'TH' | 'NZ' | 'CN'
  | 'GLOBAL';

/** Known sanctions lists */
export type SanctionsList =
  | 'OFAC_SDN'
  | 'OFAC_NON_SDN'
  | 'EU_CONSOLIDATED'
  | 'UN_SECURITY_COUNCIL'
  | 'UK_OFSI'
  | 'UAE_LOCAL'
  | 'MAS_TFS'
  | 'HK_UNSO'
  | 'INDIA_DOMESTIC'
  | 'KOFIU_DOMESTIC'
  | 'BNM_DOMESTIC'
  | 'AMLO_DOMESTIC'
  | 'NZ_DESIGNATED'
  | 'OPENSANCTIONS'
  | 'CHAINALYSIS'
  | 'CUSTOM';

/** How a match was determined */
export type MatchType =
  | 'exact_address'
  | 'fuzzy_name'
  | 'alias_match'
  | 'associated'
  | 'partial';

/** Entity sanctioning status */
export type EntityStatus = 'active' | 'delisted';

// ---------------------------------------------------------------------------
// Screening context & results
// ---------------------------------------------------------------------------

/** Context passed to providers for jurisdiction-aware routing */
export interface ScreeningContext {
  token?: Token | string;
  currency?: string;
  amount?: string;
  chain?: Chain | string;
  agentId?: string;
  [key: string]: unknown;
}

/** A single match from a screening provider */
export interface ScreeningMatch {
  list: SanctionsList;
  matchType: MatchType;
  similarity: number;
  matchedValue: string;
  entityStatus: EntityStatus;
  entityName?: string;
  program?: string;
}

/** Result from a single screening provider */
export interface ScreeningResult {
  providerId: string;
  hit: boolean;
  matches: ScreeningMatch[];
  listsChecked: readonly SanctionsList[];
  entriesSearched: number;
  durationMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// ScreeningProvider interface
// ---------------------------------------------------------------------------

/**
 * Pluggable screening provider interface.
 *
 * Providers declare what query types they support via `queryTypes`.
 * The ScreeningAggregator uses this to route queries: addresses go
 * to `'address'` or `'both'` providers; entity names go to
 * `'entity_name'` or `'both'` providers.
 */
export interface ScreeningProvider {
  readonly id: string;
  readonly name: string;
  readonly lists: readonly SanctionsList[];
  readonly requiresApiKey: boolean;
  readonly browserCompatible: boolean;
  readonly queryTypes: readonly QueryType[];

  /** Screen an address or entity name */
  screen(query: string, context?: ScreeningContext): Promise<ScreeningResult>;

  /** Whether this provider is currently available */
  isAvailable(): boolean;

  /** Sync local data (optional — only for providers with local cache) */
  sync?(): Promise<{ updated: boolean; count: number }>;

  /** Number of entries in the provider's dataset (optional) */
  getEntryCount?(): number;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Regex for Ethereum-style addresses (0x + 40 hex chars) */
const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Check if a query string is a blockchain address */
export function isBlockchainAddress(query: string): boolean {
  return ETH_ADDRESS_RE.test(query);
}

/** Check if a provider supports the detected query type */
export function providerSupportsQuery(
  provider: ScreeningProvider,
  query: string,
): boolean {
  const isAddr = isBlockchainAddress(query);
  if (isAddr) {
    return provider.queryTypes.includes('address') || provider.queryTypes.includes('both');
  }
  return provider.queryTypes.includes('entity_name') || provider.queryTypes.includes('both');
}

// ---------------------------------------------------------------------------
// Jurisdiction mapping — required sanctions lists by token/currency
// ---------------------------------------------------------------------------

/** Required sanctions lists by crypto token */
export const TOKEN_REQUIRED_LISTS: Record<string, readonly SanctionsList[]> = {
  USDC:  ['OFAC_SDN'],
  EURC:  ['EU_CONSOLIDATED'],
  USDT:  ['OFAC_SDN', 'EU_CONSOLIDATED'],
  DAI:   ['OFAC_SDN', 'EU_CONSOLIDATED'],
  USDP:  ['OFAC_SDN'],
  USDG:  ['OFAC_SDN'],
};

/** Required sanctions lists by fiat currency */
export const CURRENCY_REQUIRED_LISTS: Record<string, readonly SanctionsList[]> = {
  USD: ['OFAC_SDN'],
  EUR: ['EU_CONSOLIDATED'],
  GBP: ['UK_OFSI'],
  AED: ['UAE_LOCAL', 'UN_SECURITY_COUNCIL'],
  INR: ['UN_SECURITY_COUNCIL', 'INDIA_DOMESTIC'],
  SGD: ['MAS_TFS', 'UN_SECURITY_COUNCIL'],
  CNY: ['UN_SECURITY_COUNCIL'],
  CNH: ['UN_SECURITY_COUNCIL'],
  HKD: ['HK_UNSO', 'UN_SECURITY_COUNCIL'],
  NZD: ['UN_SECURITY_COUNCIL', 'NZ_DESIGNATED'],
  KRW: ['UN_SECURITY_COUNCIL', 'KOFIU_DOMESTIC'],
  MYR: ['BNM_DOMESTIC', 'UN_SECURITY_COUNCIL'],
  THB: ['UN_SECURITY_COUNCIL', 'AMLO_DOMESTIC'],
};

/** Default required lists when no token/currency context */
const DEFAULT_REQUIRED_LISTS: readonly SanctionsList[] = [
  'OFAC_SDN',
  'EU_CONSOLIDATED',
  'UN_SECURITY_COUNCIL',
];

/**
 * Get the required sanctions lists for a given screening context.
 * Token takes precedence over currency when both are provided.
 */
export function getRequiredLists(context?: ScreeningContext): readonly SanctionsList[] {
  if (!context) return DEFAULT_REQUIRED_LISTS;

  // Token takes precedence (crypto path)
  if (context.token && typeof context.token === 'string') {
    const tokenLists = TOKEN_REQUIRED_LISTS[context.token];
    if (tokenLists) return tokenLists;
  }

  // Currency path (fiat)
  if (context.currency && typeof context.currency === 'string') {
    const currencyLists = CURRENCY_REQUIRED_LISTS[context.currency];
    if (currencyLists) return currencyLists;
  }

  return DEFAULT_REQUIRED_LISTS;
}
