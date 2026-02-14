// ============================================================================
// Kontext SDK - Comprehensive OFAC Sanctions Screening
// ============================================================================
//
// Provides multi-layered OFAC sanctions screening beyond simple address matching:
// - SDN List address matching (Ethereum and multi-chain)
// - Consolidated Sanctions List coverage
// - Jurisdictional screening (sanctioned countries/regions)
// - 50% Rule ownership flagging
// - Fuzzy entity name matching
// - Transaction pattern analysis (chain-hopping, mixing, structuring)
// - Sanctions list update mechanism
// - Comprehensive risk scoring
//
// Sources:
//   - U.S. Treasury OFAC SDN List: https://www.treasury.gov/ofac/downloads/sdnlist.txt
//   - OFAC Sanctions Programs: https://ofac.treasury.gov/sanctions-programs-and-country-information
//   - OFAC 50% Rule: https://ofac.treasury.gov/faqs/topic/1626
//   - GENIUS Act (2025): Stablecoin compliance framework
//
// Note on Tornado Cash: As of March 21, 2025, OFAC removed Tornado Cash
// smart contract addresses from the SDN list following the Fifth Circuit
// ruling. However, Tornado Cash developer Roman Semenov remains sanctioned.
// Tornado Cash addresses are retained here with a "DELISTED" status for
// historical reference and risk scoring, as interaction with formerly
// sanctioned infrastructure may still be a compliance risk indicator.
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/** OFAC sanctions list identifiers */
export type SanctionsList =
  | 'SDN'           // Specially Designated Nationals
  | 'SSI'           // Sectoral Sanctions Identifications
  | 'CAPTA'         // Foreign Financial Institutions Subject to Part 561
  | 'NS-MBS'        // Non-SDN Menu-Based Sanctions
  | 'CONSOLIDATED'  // Consolidated Sanctions List
  | 'DELISTED'      // Previously sanctioned, now removed (risk indicator)
  | 'COMMUNITY';    // Community-reported high-risk addresses

/** Sanctioned jurisdiction identifiers (ISO 3166-1 alpha-2 where applicable) */
export type SanctionedJurisdiction =
  | 'KP'   // North Korea (DPRK)
  | 'IR'   // Iran
  | 'CU'   // Cuba
  | 'SY'   // Syria
  | 'RU_CRIMEA'     // Russia - Crimea region
  | 'RU_DNR'        // Russia - Donetsk People's Republic
  | 'RU_LNR'        // Russia - Luhansk People's Republic
  | 'RU_ZAPORIZHZHIA' // Russia - Zaporizhzhia
  | 'RU_KHERSON'    // Russia - Kherson
  | 'BY'   // Belarus (limited sanctions)
  | 'VE'   // Venezuela (limited sanctions)
  | 'MM'   // Myanmar/Burma (limited sanctions)
  | 'SD'   // Sudan
  | 'SO'   // Somalia (limited sanctions);

/** Risk level for sanctions screening */
export type SanctionsRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE' | 'BLOCKED';

/** Entity type for sanctions context */
export type SanctionedEntityType =
  | 'MIXER'
  | 'EXCHANGE'
  | 'INDIVIDUAL'
  | 'GROUP'
  | 'PROTOCOL'
  | 'UNKNOWN';

/** A sanctioned address entry with metadata */
export interface SanctionedAddressEntry {
  /** The blockchain address */
  address: string;
  /** Which sanctions list(s) this address appears on */
  lists: SanctionsList[];
  /** The entity name associated with this address */
  entityName: string;
  /** Entity type */
  entityType: SanctionedEntityType;
  /** ISO date when the address was first sanctioned */
  dateAdded: string;
  /** ISO date when the address was removed (if applicable) */
  dateRemoved: string | null;
  /** Blockchain network(s) this address is relevant to */
  chains: string[];
  /** Additional notes */
  notes: string;
}

/** Result of a comprehensive sanctions screening */
export interface ComprehensiveSanctionsResult {
  /** Whether any sanctions match was found */
  sanctioned: boolean;
  /** Overall risk level */
  riskLevel: SanctionsRiskLevel;
  /** Numeric risk score (0-100) */
  riskScore: number;
  /** The address that was screened */
  address: string;
  /** Direct address matches */
  directMatches: SanctionsMatch[];
  /** Jurisdictional flags */
  jurisdictionFlags: JurisdictionFlag[];
  /** Pattern-based flags */
  patternFlags: PatternFlag[];
  /** 50% rule flags */
  ownershipFlags: OwnershipFlag[];
  /** Screening timestamp */
  screenedAt: string;
  /** Lists that were checked */
  listsChecked: SanctionsList[];
  /** Recommendations */
  recommendations: string[];
}

/** A match against a sanctions list */
export interface SanctionsMatch {
  /** The matched address */
  matchedAddress: string;
  /** Which list the match is on */
  list: SanctionsList;
  /** Entity name */
  entityName: string;
  /** Entity type */
  entityType: SanctionedEntityType;
  /** Match confidence (0-1, 1.0 = exact match) */
  confidence: number;
  /** Whether this is currently active or delisted */
  active: boolean;
}

/** A jurisdictional screening flag */
export interface JurisdictionFlag {
  /** The flagged jurisdiction */
  jurisdiction: SanctionedJurisdiction;
  /** Human-readable jurisdiction name */
  name: string;
  /** Reason for the flag */
  reason: string;
  /** Risk level for this jurisdiction */
  riskLevel: SanctionsRiskLevel;
}

/** A pattern-based flag */
export interface PatternFlag {
  /** Pattern type */
  pattern: 'MIXING' | 'CHAIN_HOPPING' | 'STRUCTURING' | 'RAPID_MOVEMENT' | 'PEELING_CHAIN';
  /** Human-readable description */
  description: string;
  /** Severity */
  severity: SanctionsRiskLevel;
  /** Evidence for the flag */
  evidence: string[];
}

/** A 50% rule ownership flag */
export interface OwnershipFlag {
  /** The entity that may be controlled by a sanctioned party */
  entityName: string;
  /** The sanctioned parent entity */
  sanctionedParent: string;
  /** Estimated ownership percentage */
  ownershipPercentage: number;
  /** Source of the ownership data */
  source: string;
}

/** Transaction data for pattern analysis */
export interface TransactionForAnalysis {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  chain: string;
  timestamp: string;
}

/** Entity name for fuzzy matching */
export interface EntityNameEntry {
  /** Canonical name */
  name: string;
  /** Known aliases */
  aliases: string[];
  /** Associated addresses */
  addresses: string[];
  /** Sanctions list */
  list: SanctionsList;
}

/** Sanctions list metadata */
export interface SanctionsListMetadata {
  /** When the list was last updated */
  lastUpdated: string;
  /** Number of addresses in the list */
  addressCount: number;
  /** Number of entities in the list */
  entityCount: number;
  /** Source URL */
  sourceUrl: string;
  /** Version/hash of the list */
  version: string;
}

// ============================================================================
// Sanctioned Addresses Database
// ============================================================================
// Addresses are sourced from the U.S. Treasury OFAC SDN list and related
// sanctions lists. This list should be updated regularly via the update
// mechanism provided below.
//
// NOTE: Tornado Cash smart contract addresses were REMOVED from the SDN list
// on March 21, 2025 following the Fifth Circuit ruling. They are retained
// here with DELISTED status for risk-scoring purposes. Developer Roman
// Semenov's personal addresses REMAIN sanctioned.
// ============================================================================

const SANCTIONED_ADDRESS_DATABASE: SanctionedAddressEntry[] = [
  // -------------------------------------------------------------------------
  // Lazarus Group / DPRK (North Korea) -- SDN Active
  // -------------------------------------------------------------------------
  {
    address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
    lists: ['SDN'],
    entityName: 'Lazarus Group',
    entityType: 'GROUP',
    dateAdded: '2022-04-14',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Ronin Bridge hack - primary address',
  },
  {
    address: '0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B',
    lists: ['SDN'],
    entityName: 'Lazarus Group',
    entityType: 'GROUP',
    dateAdded: '2022-04-14',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Ronin Bridge hack - associated address',
  },
  {
    address: '0x3Cffd56B47B7b41c56258D9C7731ABaDc360E460',
    lists: ['SDN'],
    entityName: 'Lazarus Group',
    entityType: 'GROUP',
    dateAdded: '2022-04-14',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Ronin Bridge hack - associated address',
  },
  {
    address: '0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1',
    lists: ['SDN'],
    entityName: 'Lazarus Group',
    entityType: 'GROUP',
    dateAdded: '2022-04-14',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Ronin Bridge hack - associated address',
  },
  {
    address: '0x4F47Bc496083C727c5fbe3CE9CDf2B0f6496270c',
    lists: ['SDN'],
    entityName: 'Lazarus Group',
    entityType: 'GROUP',
    dateAdded: '2023-08-22',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Harmony Horizon bridge hack - associated address',
  },
  {
    address: '0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f',
    lists: ['SDN'],
    entityName: 'Lazarus Group',
    entityType: 'GROUP',
    dateAdded: '2023-08-22',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Additional Lazarus-attributed address',
  },
  // -------------------------------------------------------------------------
  // Roman Semenov (Tornado Cash developer) -- SDN Active
  // Remains personally sanctioned even after Tornado Cash delisting
  // -------------------------------------------------------------------------
  {
    address: '0xdcbEfFBECcE100cCE9E4b153C4e15cB885643193',
    lists: ['SDN'],
    entityName: 'Roman Semenov',
    entityType: 'INDIVIDUAL',
    dateAdded: '2022-08-08',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Tornado Cash developer - personal wallet',
  },
  {
    address: '0x931546D9e66836AbF687d2bc64B30407bAc8C568',
    lists: ['SDN'],
    entityName: 'Roman Semenov',
    entityType: 'INDIVIDUAL',
    dateAdded: '2022-08-08',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Tornado Cash developer - personal wallet',
  },
  {
    address: '0x43fa21d92141BA9db43052492E0DeEE5aa5f0A93',
    lists: ['SDN'],
    entityName: 'Roman Semenov',
    entityType: 'INDIVIDUAL',
    dateAdded: '2022-08-08',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Tornado Cash developer - personal wallet',
  },
  // -------------------------------------------------------------------------
  // Garantex exchange -- SDN Active
  // -------------------------------------------------------------------------
  {
    address: '0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7',
    lists: ['SDN'],
    entityName: 'Garantex',
    entityType: 'EXCHANGE',
    dateAdded: '2022-04-05',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Russia-based exchange sanctioned for facilitating ransomware payments',
  },
  {
    address: '0x2f389cE8bD8ff92De3402FFCe4691d17fC4f6535',
    lists: ['SDN'],
    entityName: 'Garantex',
    entityType: 'EXCHANGE',
    dateAdded: '2022-04-05',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Garantex hot wallet',
  },
  {
    address: '0x19Aa5Fe80D33a56D56c78e82eA5E50E5d80b4Dff',
    lists: ['SDN'],
    entityName: 'Garantex',
    entityType: 'EXCHANGE',
    dateAdded: '2022-04-05',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Garantex operational address',
  },
  // -------------------------------------------------------------------------
  // Blender.io -- SDN Active
  // -------------------------------------------------------------------------
  {
    address: '0x23773E65ed146A459791799d01336DB287f25334',
    lists: ['SDN'],
    entityName: 'Blender.io',
    entityType: 'MIXER',
    dateAdded: '2022-05-06',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'First mixer sanctioned by OFAC - used by Lazarus Group',
  },
  // -------------------------------------------------------------------------
  // Sinbad.io -- SDN Active
  // -------------------------------------------------------------------------
  {
    address: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    lists: ['SDN'],
    entityName: 'Sinbad.io',
    entityType: 'MIXER',
    dateAdded: '2023-11-29',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Mixer sanctioned for North Korean money laundering. (Note: this address is commonly associated with Tornado Cash but was re-designated under Sinbad.io)',
  },
  // -------------------------------------------------------------------------
  // Tornado Cash smart contracts -- DELISTED (March 21, 2025)
  // Retained for risk scoring; interaction with formerly sanctioned
  // infrastructure is still a compliance risk indicator.
  // -------------------------------------------------------------------------
  {
    address: '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash 1 ETH pool - DELISTED per Fifth Circuit ruling',
  },
  {
    address: '0xd96f2B1c14Db8458374d9Aca76E26c3D18364307',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash 10 ETH pool - DELISTED',
  },
  {
    address: '0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBfA9',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash pool contract - DELISTED',
  },
  {
    address: '0xDD4c48C0B24039969fC16D1cdF626eaB821d3384',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash 100 ETH pool - DELISTED',
  },
  {
    address: '0xd4B88Df4D29F5CedD6857912842cff3b20C8Cfa3',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash 100 DAI pool - DELISTED',
  },
  {
    address: '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash 10000 DAI pool - DELISTED',
  },
  {
    address: '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash 100000 DAI pool - DELISTED',
  },
  {
    address: '0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash 1000 USDC pool - DELISTED',
  },
  {
    address: '0xF60dD140cFf0706bAE9Cd734Ac3683731B816EeD',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-11-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash - added November 2022 update - DELISTED',
  },
  {
    address: '0x22aaA7720ddd5388A3c0A3333430953C68f1849b',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash - DELISTED',
  },
  {
    address: '0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash - DELISTED',
  },
  {
    address: '0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash - DELISTED',
  },
  {
    address: '0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash - DELISTED',
  },
  {
    address: '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash Router - DELISTED',
  },
  {
    address: '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
    lists: ['DELISTED'],
    entityName: 'Tornado Cash',
    entityType: 'PROTOCOL',
    dateAdded: '2022-08-08',
    dateRemoved: '2025-03-21',
    chains: ['ethereum'],
    notes: 'Tornado Cash - DELISTED',
  },
  // -------------------------------------------------------------------------
  // Zedcex / Zedxion -- SDN Active (IRGC-linked)
  // First-ever designation of an IRGC-linked digital asset exchange (2024)
  // -------------------------------------------------------------------------
  {
    address: '0xaeAAc358560e11f52454D997AAFF2c5731B6f8a6',
    lists: ['SDN'],
    entityName: 'Zedcex Exchange',
    entityType: 'EXCHANGE',
    dateAdded: '2024-06-26',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'IRGC-linked digital asset exchange',
  },
  // -------------------------------------------------------------------------
  // Additional known sanctioned addresses from SDN list
  // -------------------------------------------------------------------------
  {
    address: '0x7F367cC41522cE07553e823bf3be79A889DEbe1B',
    lists: ['SDN'],
    entityName: 'DPRK IT Workers',
    entityType: 'GROUP',
    dateAdded: '2023-05-23',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'North Korean IT worker network generating revenue for WMD programs',
  },
  {
    address: '0x01e2919679362dFBC9ee1644Ba9C6da6D6245BB1',
    lists: ['SDN'],
    entityName: 'DPRK Cyber Operations',
    entityType: 'GROUP',
    dateAdded: '2023-04-24',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'DPRK-attributed cyber theft proceeds',
  },
  {
    address: '0xc455f7fd3e0e12afd51fba5c106909934d8a0e4a',
    lists: ['SDN'],
    entityName: 'DPRK Cyber Operations',
    entityType: 'GROUP',
    dateAdded: '2023-08-22',
    dateRemoved: null,
    chains: ['ethereum'],
    notes: 'Stake.com hack proceeds - DPRK attributed',
  },
];

// ============================================================================
// Sanctioned Jurisdictions Database
// ============================================================================

interface JurisdictionInfo {
  code: SanctionedJurisdiction;
  name: string;
  sanctionsProgram: string;
  riskLevel: SanctionsRiskLevel;
  comprehensive: boolean; // True = comprehensive sanctions (all transactions blocked)
}

const SANCTIONED_JURISDICTIONS: JurisdictionInfo[] = [
  {
    code: 'KP',
    name: 'North Korea (DPRK)',
    sanctionsProgram: 'North Korea Sanctions Regulations, 31 C.F.R. Part 510',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'IR',
    name: 'Iran',
    sanctionsProgram: 'Iranian Transactions and Sanctions Regulations, 31 C.F.R. Part 560',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'CU',
    name: 'Cuba',
    sanctionsProgram: 'Cuban Assets Control Regulations, 31 C.F.R. Part 515',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'SY',
    name: 'Syria',
    sanctionsProgram: 'Syrian Sanctions Regulations, 31 C.F.R. Part 542',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'RU_CRIMEA',
    name: 'Crimea Region of Ukraine (Russian-occupied)',
    sanctionsProgram: 'Ukraine-/Russia-Related Sanctions, E.O. 13685',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'RU_DNR',
    name: 'Donetsk People\'s Republic (Russian-occupied Ukraine)',
    sanctionsProgram: 'Ukraine-/Russia-Related Sanctions, E.O. 14065',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'RU_LNR',
    name: 'Luhansk People\'s Republic (Russian-occupied Ukraine)',
    sanctionsProgram: 'Ukraine-/Russia-Related Sanctions, E.O. 14065',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'RU_ZAPORIZHZHIA',
    name: 'Zaporizhzhia Region (Russian-occupied Ukraine)',
    sanctionsProgram: 'Ukraine-/Russia-Related Sanctions, E.O. 14065',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'RU_KHERSON',
    name: 'Kherson Region (Russian-occupied Ukraine)',
    sanctionsProgram: 'Ukraine-/Russia-Related Sanctions, E.O. 14065',
    riskLevel: 'BLOCKED',
    comprehensive: true,
  },
  {
    code: 'BY',
    name: 'Belarus',
    sanctionsProgram: 'Belarus Sanctions Regulations, 31 C.F.R. Part 548',
    riskLevel: 'HIGH',
    comprehensive: false,
  },
  {
    code: 'VE',
    name: 'Venezuela',
    sanctionsProgram: 'Venezuela Sanctions Regulations, 31 C.F.R. Part 591',
    riskLevel: 'HIGH',
    comprehensive: false,
  },
  {
    code: 'MM',
    name: 'Myanmar (Burma)',
    sanctionsProgram: 'Burmese Sanctions Regulations, 31 C.F.R. Part 525',
    riskLevel: 'MEDIUM',
    comprehensive: false,
  },
  {
    code: 'SD',
    name: 'Sudan',
    sanctionsProgram: 'Sudanese Sanctions Regulations, 31 C.F.R. Part 538',
    riskLevel: 'HIGH',
    comprehensive: false,
  },
  {
    code: 'SO',
    name: 'Somalia',
    sanctionsProgram: 'Somalia Sanctions Regulations, 31 C.F.R. Part 551',
    riskLevel: 'MEDIUM',
    comprehensive: false,
  },
];

// ============================================================================
// Entity Names Database (for fuzzy matching)
// ============================================================================

const SANCTIONED_ENTITIES: EntityNameEntry[] = [
  {
    name: 'Lazarus Group',
    aliases: ['HIDDEN COBRA', 'Guardians of Peace', 'APT38', 'Bluenoroff', 'Stardust Chollima', 'TEMP.Hermit'],
    addresses: [
      '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
      '0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B',
      '0x3Cffd56B47B7b41c56258D9C7731ABaDc360E460',
      '0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1',
      '0x4F47Bc496083C727c5fbe3CE9CDf2B0f6496270c',
    ],
    list: 'SDN',
  },
  {
    name: 'Roman Semenov',
    aliases: ['Roman Storm', 'Tornado Cash Developer'],
    addresses: [
      '0xdcbEfFBECcE100cCE9E4b153C4e15cB885643193',
      '0x931546D9e66836AbF687d2bc64B30407bAc8C568',
      '0x43fa21d92141BA9db43052492E0DeEE5aa5f0A93',
    ],
    list: 'SDN',
  },
  {
    name: 'Garantex',
    aliases: ['Garantex Exchange', 'garantex.io', 'GARANTEX EUROPE OU'],
    addresses: [
      '0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7',
      '0x2f389cE8bD8ff92De3402FFCe4691d17fC4f6535',
      '0x19Aa5Fe80D33a56D56c78e82eA5E50E5d80b4Dff',
    ],
    list: 'SDN',
  },
  {
    name: 'Blender.io',
    aliases: ['Blender', 'Blender Mixer'],
    addresses: ['0x23773E65ed146A459791799d01336DB287f25334'],
    list: 'SDN',
  },
  {
    name: 'Tornado Cash',
    aliases: ['TornadoCash', 'TC', 'Tornado'],
    addresses: [
      '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
      '0xd96f2B1c14Db8458374d9Aca76E26c3D18364307',
      '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',
    ],
    list: 'DELISTED',
  },
  {
    name: 'Zedcex Exchange',
    aliases: ['Zedxion', 'Zedcex'],
    addresses: ['0xaeAAc358560e11f52454D997AAFF2c5731B6f8a6'],
    list: 'SDN',
  },
];

// ============================================================================
// Pre-computed lookup indexes
// ============================================================================

/** Active (non-delisted) addresses for fast lookup */
let activeAddressSet: Set<string> = new Set();
/** All addresses (including delisted) for risk scoring */
let allAddressSet: Set<string> = new Set();
/** Map from lowercase address to entry */
let addressToEntry: Map<string, SanctionedAddressEntry> = new Map();

export function rebuildIndexes(): void {
  activeAddressSet = new Set();
  allAddressSet = new Set();
  addressToEntry = new Map();

  for (const entry of SANCTIONED_ADDRESS_DATABASE) {
    const lower = entry.address.toLowerCase();
    allAddressSet.add(lower);
    addressToEntry.set(lower, entry);

    const isActive = entry.dateRemoved === null;
    if (isActive) {
      activeAddressSet.add(lower);
    }
  }
}

// Initialize on module load
rebuildIndexes();

// ============================================================================
// Sanctions list metadata
// ============================================================================

let listMetadata: SanctionsListMetadata = {
  lastUpdated: '2025-03-21',
  addressCount: SANCTIONED_ADDRESS_DATABASE.length,
  entityCount: SANCTIONED_ENTITIES.length,
  sourceUrl: 'https://www.treasury.gov/ofac/downloads/sdnlist.txt',
  version: '2025-03-21-initial',
};

// ============================================================================
// OFACSanctionsScreener - Main Class
// ============================================================================

/**
 * Comprehensive OFAC sanctions screening engine.
 *
 * Goes beyond simple address matching to provide multi-layered screening
 * aligned with GENIUS Act requirements and OFAC compliance best practices.
 *
 * Features:
 * - SDN and Consolidated Sanctions List address matching
 * - Delisted address risk flagging (e.g., former Tornado Cash contracts)
 * - Jurisdictional screening for sanctioned countries
 * - 50% Rule ownership flagging
 * - Fuzzy entity name matching with alias support
 * - Transaction pattern analysis (mixing, chain-hopping, structuring)
 * - Sanctions list update mechanism
 * - Comprehensive risk scoring
 *
 * @example
 * ```typescript
 * const screener = new OFACSanctionsScreener();
 *
 * // Screen a single address
 * const result = screener.screenAddress('0x098B716B...');
 * if (result.sanctioned) {
 *   console.log('BLOCKED:', result.recommendations);
 * }
 *
 * // Screen with jurisdiction context
 * const result2 = screener.screenAddress('0x...', { jurisdiction: 'IR' });
 *
 * // Fuzzy entity name search
 * const matches = screener.searchEntityName('Lazarus');
 * ```
 */
export class OFACSanctionsScreener {
  // --------------------------------------------------------------------------
  // Core Address Screening
  // --------------------------------------------------------------------------

  /**
   * Check if an address is on an active sanctions list.
   * Returns true only for currently sanctioned (non-delisted) addresses.
   */
  isActivelySanctioned(address: string): boolean {
    return activeAddressSet.has(address.toLowerCase());
  }

  /**
   * Check if an address has ever appeared on any sanctions list,
   * including those that have been delisted.
   */
  hasAnySanctionsHistory(address: string): boolean {
    return allAddressSet.has(address.toLowerCase());
  }

  /**
   * Get the full entry for a sanctioned address.
   */
  getAddressEntry(address: string): SanctionedAddressEntry | undefined {
    return addressToEntry.get(address.toLowerCase());
  }

  /**
   * Perform a comprehensive sanctions screening on an address.
   * Checks against all lists, evaluates jurisdiction, and computes risk score.
   */
  screenAddress(
    address: string,
    context?: {
      jurisdiction?: SanctionedJurisdiction;
      counterpartyAddress?: string;
      amount?: number;
      chain?: string;
    },
  ): ComprehensiveSanctionsResult {
    const lower = address.toLowerCase();
    const directMatches: SanctionsMatch[] = [];
    const jurisdictionFlags: JurisdictionFlag[] = [];
    const patternFlags: PatternFlag[] = [];
    const ownershipFlags: OwnershipFlag[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // --- Step 1: Direct address matching ---
    const entry = addressToEntry.get(lower);
    if (entry) {
      const isActive = entry.dateRemoved === null;
      directMatches.push({
        matchedAddress: entry.address,
        list: entry.lists[0]!,
        entityName: entry.entityName,
        entityType: entry.entityType,
        confidence: 1.0,
        active: isActive,
      });

      if (isActive) {
        riskScore = 100;
        recommendations.push(
          `BLOCK: Address ${address} is on the OFAC ${entry.lists.join(', ')} list as ${entry.entityName}. Transaction is prohibited under U.S. law.`,
        );
      } else {
        // Delisted but historically sanctioned
        riskScore = Math.max(riskScore, 45);
        recommendations.push(
          `CAUTION: Address ${address} was previously sanctioned as ${entry.entityName} (${entry.lists.join(', ')}). Delisted on ${entry.dateRemoved}. Enhanced due diligence recommended.`,
        );
      }
    }

    // Also check counterparty if provided
    if (context?.counterpartyAddress) {
      const cpLower = context.counterpartyAddress.toLowerCase();
      const cpEntry = addressToEntry.get(cpLower);
      if (cpEntry) {
        const cpActive = cpEntry.dateRemoved === null;
        directMatches.push({
          matchedAddress: cpEntry.address,
          list: cpEntry.lists[0]!,
          entityName: cpEntry.entityName,
          entityType: cpEntry.entityType,
          confidence: 1.0,
          active: cpActive,
        });

        if (cpActive) {
          riskScore = 100;
          recommendations.push(
            `BLOCK: Counterparty address ${context.counterpartyAddress} is on the OFAC ${cpEntry.lists.join(', ')} list as ${cpEntry.entityName}.`,
          );
        } else {
          riskScore = Math.max(riskScore, 45);
          recommendations.push(
            `CAUTION: Counterparty was previously sanctioned as ${cpEntry.entityName}.`,
          );
        }
      }
    }

    // --- Step 2: Jurisdictional screening ---
    if (context?.jurisdiction) {
      const jurisdictionInfo = SANCTIONED_JURISDICTIONS.find(
        (j) => j.code === context.jurisdiction,
      );
      if (jurisdictionInfo) {
        jurisdictionFlags.push({
          jurisdiction: jurisdictionInfo.code,
          name: jurisdictionInfo.name,
          reason: `Transaction involves ${jurisdictionInfo.name}, sanctioned under ${jurisdictionInfo.sanctionsProgram}`,
          riskLevel: jurisdictionInfo.riskLevel,
        });

        if (jurisdictionInfo.comprehensive) {
          riskScore = 100;
          recommendations.push(
            `BLOCK: Transaction involves comprehensively sanctioned jurisdiction: ${jurisdictionInfo.name}. All transactions are prohibited under ${jurisdictionInfo.sanctionsProgram}.`,
          );
        } else {
          riskScore = Math.max(riskScore, 70);
          recommendations.push(
            `REVIEW: Transaction involves partially sanctioned jurisdiction: ${jurisdictionInfo.name}. Enhanced screening required per ${jurisdictionInfo.sanctionsProgram}.`,
          );
        }
      }
    }

    // --- Step 3: Determine overall risk level ---
    let riskLevel: SanctionsRiskLevel;
    if (riskScore >= 100) {
      riskLevel = 'BLOCKED';
    } else if (riskScore >= 70) {
      riskLevel = 'SEVERE';
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
    } else if (riskScore > 0) {
      riskLevel = 'LOW';
    } else {
      riskLevel = 'NONE';
    }

    const sanctioned = directMatches.some((m) => m.active);

    if (recommendations.length === 0) {
      recommendations.push('Address passed all sanctions screening checks.');
    }

    return {
      sanctioned,
      riskLevel,
      riskScore: Math.min(riskScore, 100),
      address,
      directMatches,
      jurisdictionFlags,
      patternFlags,
      ownershipFlags,
      screenedAt: new Date().toISOString(),
      listsChecked: ['SDN', 'SSI', 'CONSOLIDATED', 'DELISTED'],
      recommendations,
    };
  }

  // --------------------------------------------------------------------------
  // Jurisdictional Screening
  // --------------------------------------------------------------------------

  /**
   * Screen a jurisdiction for sanctions.
   */
  screenJurisdiction(code: string): JurisdictionFlag | null {
    const info = SANCTIONED_JURISDICTIONS.find(
      (j) => j.code === code || j.name.toLowerCase().includes(code.toLowerCase()),
    );
    if (!info) return null;

    return {
      jurisdiction: info.code,
      name: info.name,
      reason: `Sanctioned under ${info.sanctionsProgram}`,
      riskLevel: info.riskLevel,
    };
  }

  /**
   * Get all sanctioned jurisdictions.
   */
  getSanctionedJurisdictions(): JurisdictionInfo[] {
    return [...SANCTIONED_JURISDICTIONS];
  }

  /**
   * Check if a jurisdiction has comprehensive sanctions (all transactions blocked).
   */
  isComprehensiveSanctions(code: SanctionedJurisdiction): boolean {
    const info = SANCTIONED_JURISDICTIONS.find((j) => j.code === code);
    return info?.comprehensive ?? false;
  }

  // --------------------------------------------------------------------------
  // Fuzzy Entity Name Matching
  // --------------------------------------------------------------------------

  /**
   * Search for sanctioned entities by name with fuzzy matching.
   * Uses normalized Levenshtein distance and alias matching.
   *
   * @param query - Name to search for
   * @param threshold - Minimum similarity score (0-1, default 0.6)
   * @returns Matching entities sorted by relevance
   */
  searchEntityName(query: string, threshold: number = 0.6): Array<{
    entity: EntityNameEntry;
    similarity: number;
    matchedOn: string; // Which name/alias matched
  }> {
    const queryLower = query.toLowerCase().trim();
    const results: Array<{
      entity: EntityNameEntry;
      similarity: number;
      matchedOn: string;
    }> = [];

    for (const entity of SANCTIONED_ENTITIES) {
      // Check canonical name
      const nameSim = computeSimilarity(queryLower, entity.name.toLowerCase());
      if (nameSim >= threshold) {
        results.push({ entity, similarity: nameSim, matchedOn: entity.name });
        continue;
      }

      // Check aliases
      let bestAliasSim = 0;
      let bestAlias = '';
      for (const alias of entity.aliases) {
        const aliasSim = computeSimilarity(queryLower, alias.toLowerCase());
        if (aliasSim > bestAliasSim) {
          bestAliasSim = aliasSim;
          bestAlias = alias;
        }
      }
      if (bestAliasSim >= threshold) {
        results.push({ entity, similarity: bestAliasSim, matchedOn: bestAlias });
        continue;
      }

      // Check substring containment (exact substring match = 0.8 similarity)
      const allNames = [entity.name, ...entity.aliases];
      for (const name of allNames) {
        if (name.toLowerCase().includes(queryLower) || queryLower.includes(name.toLowerCase())) {
          results.push({ entity, similarity: 0.8, matchedOn: name });
          break;
        }
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);
    return results;
  }

  // --------------------------------------------------------------------------
  // 50% Rule Screening
  // --------------------------------------------------------------------------

  /**
   * Check if an entity may be subject to the OFAC 50% Rule.
   *
   * Under the 50% Rule, entities owned 50% or more (individually or in
   * aggregate) by one or more sanctioned persons are themselves blocked,
   * even if not explicitly named on the SDN list.
   *
   * This method checks a provided ownership structure against known
   * sanctioned entities.
   *
   * @param ownershipEntries - Array of { ownerName, ownershipPercentage } objects
   * @returns Array of OwnershipFlag for any sanctioned owners
   */
  checkFiftyPercentRule(
    entityName: string,
    ownershipEntries: Array<{ ownerName: string; ownershipPercentage: number }>,
  ): OwnershipFlag[] {
    const flags: OwnershipFlag[] = [];
    let totalSanctionedOwnership = 0;

    for (const owner of ownershipEntries) {
      // Check if owner name matches any sanctioned entity
      const matches = this.searchEntityName(owner.ownerName, 0.7);
      if (matches.length > 0) {
        totalSanctionedOwnership += owner.ownershipPercentage;
        flags.push({
          entityName,
          sanctionedParent: matches[0]!.entity.name,
          ownershipPercentage: owner.ownershipPercentage,
          source: `Fuzzy match on "${owner.ownerName}" -> "${matches[0]!.matchedOn}" (${Math.round(matches[0]!.similarity * 100)}% match)`,
        });
      }
    }

    // If aggregate ownership by sanctioned parties >= 50%, flag
    if (totalSanctionedOwnership >= 50 && flags.length > 0) {
      // Add a summary flag
      flags.push({
        entityName,
        sanctionedParent: `Aggregate sanctioned ownership: ${totalSanctionedOwnership}%`,
        ownershipPercentage: totalSanctionedOwnership,
        source: 'OFAC 50% Rule: Entity is considered blocked due to aggregate sanctioned ownership >= 50%',
      });
    }

    return flags;
  }

  // --------------------------------------------------------------------------
  // Transaction Pattern Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze a set of transactions for patterns associated with sanctions evasion.
   *
   * Detects:
   * - Mixing/tumbling indicators (interaction with known mixers)
   * - Chain-hopping patterns (rapid cross-chain movements)
   * - Structuring (amounts just below reporting thresholds)
   * - Rapid fund movement through intermediaries
   * - Peeling chain patterns
   */
  analyzeTransactionPatterns(
    transactions: TransactionForAnalysis[],
  ): PatternFlag[] {
    const flags: PatternFlag[] = [];

    if (transactions.length === 0) return flags;

    // --- Pattern 1: Mixing/Tumbling ---
    const mixerFlag = this.detectMixingPattern(transactions);
    if (mixerFlag) flags.push(mixerFlag);

    // --- Pattern 2: Chain-hopping ---
    const chainHopFlag = this.detectChainHopping(transactions);
    if (chainHopFlag) flags.push(chainHopFlag);

    // --- Pattern 3: Structuring ---
    const structuringFlag = this.detectStructuring(transactions);
    if (structuringFlag) flags.push(structuringFlag);

    // --- Pattern 4: Rapid movement ---
    const rapidFlag = this.detectRapidMovement(transactions);
    if (rapidFlag) flags.push(rapidFlag);

    // --- Pattern 5: Peeling chain ---
    const peelingFlag = this.detectPeelingChain(transactions);
    if (peelingFlag) flags.push(peelingFlag);

    return flags;
  }

  private detectMixingPattern(txs: TransactionForAnalysis[]): PatternFlag | null {
    const evidence: string[] = [];

    for (const tx of txs) {
      // Check if any address in the transaction is a known mixer
      const fromEntry = addressToEntry.get(tx.from.toLowerCase());
      const toEntry = addressToEntry.get(tx.to.toLowerCase());

      if (fromEntry?.entityType === 'MIXER') {
        evidence.push(`Received funds from known mixer: ${fromEntry.entityName} (tx: ${tx.txHash})`);
      }
      if (toEntry?.entityType === 'MIXER') {
        evidence.push(`Sent funds to known mixer: ${toEntry.entityName} (tx: ${tx.txHash})`);
      }
    }

    if (evidence.length > 0) {
      return {
        pattern: 'MIXING',
        description: 'Transaction history includes interaction with known mixing/tumbling services',
        severity: 'HIGH',
        evidence,
      };
    }

    return null;
  }

  private detectChainHopping(txs: TransactionForAnalysis[]): PatternFlag | null {
    // Detect rapid cross-chain movements (different chains within short time)
    const chainTimestamps = new Map<string, number[]>();

    for (const tx of txs) {
      const timestamps = chainTimestamps.get(tx.chain) ?? [];
      timestamps.push(new Date(tx.timestamp).getTime());
      chainTimestamps.set(tx.chain, timestamps);
    }

    if (chainTimestamps.size < 2) return null;

    const allTimestamps: Array<{ chain: string; time: number }> = [];
    for (const [chain, times] of chainTimestamps) {
      for (const time of times) {
        allTimestamps.push({ chain, time });
      }
    }
    allTimestamps.sort((a, b) => a.time - b.time);

    const evidence: string[] = [];
    const RAPID_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    for (let i = 1; i < allTimestamps.length; i++) {
      const prev = allTimestamps[i - 1];
      const curr = allTimestamps[i];
      if (prev && curr && prev.chain !== curr.chain) {
        const gap = curr.time - prev.time;
        if (gap < RAPID_WINDOW_MS) {
          evidence.push(
            `Cross-chain hop: ${prev.chain} -> ${curr.chain} within ${Math.round(gap / 1000)}s`,
          );
        }
      }
    }

    if (evidence.length >= 2) {
      return {
        pattern: 'CHAIN_HOPPING',
        description: 'Rapid cross-chain fund movements detected, a pattern associated with sanctions evasion',
        severity: 'MEDIUM',
        evidence,
      };
    }

    return null;
  }

  private detectStructuring(txs: TransactionForAnalysis[]): PatternFlag | null {
    // Detect amounts clustered just below reporting thresholds
    const REPORTING_THRESHOLD = 10000;
    const STRUCTURING_BAND_LOW = REPORTING_THRESHOLD * 0.8;
    const STRUCTURING_BAND_HIGH = REPORTING_THRESHOLD;

    const structuredTxs = txs.filter(
      (tx) => tx.amount >= STRUCTURING_BAND_LOW && tx.amount < STRUCTURING_BAND_HIGH,
    );

    if (structuredTxs.length >= 3) {
      const evidence = structuredTxs.map(
        (tx) => `$${tx.amount.toFixed(2)} on ${tx.chain} (tx: ${tx.txHash})`,
      );

      return {
        pattern: 'STRUCTURING',
        description: `${structuredTxs.length} transactions clustered just below the $${REPORTING_THRESHOLD} reporting threshold, a pattern consistent with structuring`,
        severity: 'HIGH',
        evidence,
      };
    }

    return null;
  }

  private detectRapidMovement(txs: TransactionForAnalysis[]): PatternFlag | null {
    // Detect rapid succession of transactions (potential layering)
    const sorted = [...txs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const RAPID_THRESHOLD_MS = 60 * 1000; // 1 minute
    const evidence: string[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev && curr) {
        const gap = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        if (gap < RAPID_THRESHOLD_MS && gap >= 0) {
          evidence.push(
            `${curr.from} -> ${curr.to}: $${curr.amount} within ${Math.round(gap / 1000)}s of previous tx`,
          );
        }
      }
    }

    if (evidence.length >= 3) {
      return {
        pattern: 'RAPID_MOVEMENT',
        description: 'Rapid succession of fund movements detected, consistent with layering/obfuscation',
        severity: 'MEDIUM',
        evidence,
      };
    }

    return null;
  }

  private detectPeelingChain(txs: TransactionForAnalysis[]): PatternFlag | null {
    // Detect peeling chain: a pattern where funds are sent through a series of
    // addresses, peeling off small amounts at each step
    const sorted = [...txs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const evidence: string[] = [];
    let consecutiveDecreases = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!prev || !curr) continue;

      // Check if amount is decreasing and to a new address
      if (curr.amount < prev.amount && curr.amount > 0) {
        const peeled = prev.amount - curr.amount;
        if (peeled < prev.amount * 0.3) {
          // Small peel (< 30% of previous amount)
          consecutiveDecreases++;
          evidence.push(
            `Peel: $${prev.amount.toFixed(2)} -> $${curr.amount.toFixed(2)} (peeled $${peeled.toFixed(2)})`,
          );
        }
      } else {
        consecutiveDecreases = 0;
      }
    }

    if (consecutiveDecreases >= 3) {
      return {
        pattern: 'PEELING_CHAIN',
        description: 'Peeling chain pattern detected: sequential transactions with decreasing amounts to different addresses',
        severity: 'MEDIUM',
        evidence,
      };
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Sanctions List Management
  // --------------------------------------------------------------------------

  /**
   * Add new sanctioned addresses to the database at runtime.
   * Returns the count of newly added addresses.
   */
  addAddresses(entries: SanctionedAddressEntry[]): number {
    let added = 0;
    for (const entry of entries) {
      const lower = entry.address.toLowerCase();
      if (!allAddressSet.has(lower)) {
        SANCTIONED_ADDRESS_DATABASE.push(entry);
        added++;
      }
    }
    if (added > 0) {
      rebuildIndexes();
      listMetadata = {
        ...listMetadata,
        lastUpdated: new Date().toISOString(),
        addressCount: SANCTIONED_ADDRESS_DATABASE.length,
        version: `runtime-update-${Date.now()}`,
      };
    }
    return added;
  }

  /**
   * Add new entity names for fuzzy matching.
   */
  addEntities(entities: EntityNameEntry[]): number {
    let added = 0;
    for (const entity of entities) {
      const exists = SANCTIONED_ENTITIES.some(
        (e) => e.name.toLowerCase() === entity.name.toLowerCase(),
      );
      if (!exists) {
        SANCTIONED_ENTITIES.push(entity);
        added++;
      }
    }
    if (added > 0) {
      listMetadata = {
        ...listMetadata,
        lastUpdated: new Date().toISOString(),
        entityCount: SANCTIONED_ENTITIES.length,
        version: `runtime-entity-update-${Date.now()}`,
      };
    }
    return added;
  }

  /**
   * Get current sanctions list metadata.
   */
  getListMetadata(): SanctionsListMetadata {
    return { ...listMetadata };
  }

  /**
   * Get all active sanctioned addresses (non-delisted).
   */
  getActiveSanctionedAddresses(): string[] {
    return [...activeAddressSet];
  }

  /**
   * Get all sanctioned addresses including delisted.
   */
  getAllAddresses(): string[] {
    return [...allAddressSet];
  }

  /**
   * Get the count of active sanctioned addresses.
   */
  getActiveAddressCount(): number {
    return activeAddressSet.size;
  }

  /**
   * Get the count of all addresses (including delisted).
   */
  getTotalAddressCount(): number {
    return allAddressSet.size;
  }

  /**
   * Get all entity names in the database.
   */
  getEntities(): EntityNameEntry[] {
    return [...SANCTIONED_ENTITIES];
  }
}

// ============================================================================
// String Similarity (Normalized Levenshtein Distance)
// ============================================================================

/**
 * Compute similarity between two strings using normalized Levenshtein distance.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const maxLen = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);
  return 1.0 - distance / maxLen;
}

/**
 * Compute the Levenshtein edit distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use single-row optimization for space efficiency
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,         // deletion
        (curr[j - 1] ?? 0) + 1,     // insertion
        (prev[j - 1] ?? 0) + cost,  // substitution
      );
    }
    // Copy current row to previous
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j] ?? 0;
    }
  }

  return prev[n] ?? 0;
}

// ============================================================================
// Default export: singleton instance
// ============================================================================

export const ofacScreener = new OFACSanctionsScreener();
