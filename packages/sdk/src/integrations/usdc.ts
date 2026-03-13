// ============================================================================
// Kontext SDK - USDC Integration
// ============================================================================

import type {
  LogTransactionInput,
  UsdcComplianceCheck,
  ComplianceCheckResult,
  AnomalySeverity,
  Chain,
} from '../types.js';
import { parseAmount } from '../utils.js';
import { OFAC_SDN_ADDRESSES } from './data/ofac-addresses.js';
import * as fs from 'fs';
import * as path from 'path';

/** Known USDC contract addresses on supported chains */
const USDC_CONTRACTS: Record<string, string> = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  // Arc (Circle's stablecoin-native blockchain) -- placeholder address, update when Arc mainnet launches
  arc: '0xa0c0000000000000000000000000000000000001',
};

/** USDC has 6 decimals */
const _USDC_DECIMALS = 6; // eslint-disable-line @typescript-eslint/no-unused-vars

/** Mutable local copy of OFAC addresses (supports addSanctionedAddresses / replaceSanctionedAddresses) */
const SANCTIONED_ADDRESSES: string[] = [...OFAC_SDN_ADDRESSES];

/**
 * Pre-computed set of lowercased sanctioned addresses for O(1) lookups.
 * Initialized from shared OFAC address list, then merged with OFAC SLS cache if available.
 */
const SANCTIONED_SET: Set<string> = new Set(
  SANCTIONED_ADDRESSES.map((addr) => addr.toLowerCase()),
);

// Load cached OFAC SDN addresses from `kontext sync` if available
function loadCachedSDN(): void {
  try {
    const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
    const cachePath = path.join(dataDir, 'ofac-sdn-cache.json');
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      if (Array.isArray(cache.addresses)) {
        for (const addr of cache.addresses) {
          SANCTIONED_SET.add(String(addr).toLowerCase());
        }
      }
    }
  } catch {
    // Cache not available — fall back to hardcoded list
  }
}
loadCachedSDN();

/** Threshold amounts that trigger enhanced due diligence (GENIUS Act aligned) */
const ENHANCED_DUE_DILIGENCE_THRESHOLD = 3000;
const REPORTING_THRESHOLD = 10000;
const LARGE_TRANSACTION_THRESHOLD = 50000;

/** Sanctions list identifiers for compliance reporting */
const SANCTIONS_LIST_ID = 'OFAC_SDN';

/**
 * Result of a sanctions check with list matching details.
 */
export interface SanctionsCheckResult {
  /** Whether the address is sanctioned */
  sanctioned: boolean;
  /** The address that was checked */
  address: string;
  /** Which sanctions list matched (if any) */
  listMatch: string | null;
  /** Matched sanctioned address (original case) */
  matchedAddress: string | null;
}

/**
 * USDC-specific compliance helper functions.
 *
 * Provides pre-built compliance checks for USDC transactions on Base and
 * Ethereum, aligned with the GENIUS Act requirements for stablecoin transfers.
 *
 * Checks include:
 * - Token validation (is it USDC?)
 * - Chain support validation
 * - Amount threshold checks (EDD, reporting, large tx)
 * - Address format validation
 * - Sanctions screening against OFAC SDN list
 * - Transfer limit checks
 */
export class UsdcCompliance {
  /**
   * Run a full compliance check on a USDC transaction.
   *
   * @param tx - Transaction to evaluate
   * @returns UsdcComplianceCheck with pass/fail results and recommendations
   *
   * @example
   * ```typescript
   * const check = UsdcCompliance.checkTransaction({
   *   txHash: '0x...',
   *   chain: 'base',
   *   amount: '5000',
   *   token: 'USDC',
   *   from: '0xSender...',
   *   to: '0xReceiver...',
   *   agentId: 'agent-1',
   * });
   * if (!check.compliant) {
   *   console.log('Non-compliant:', check.recommendations);
   * }
   * ```
   */
  static checkTransaction(tx: LogTransactionInput): UsdcComplianceCheck {
    const checks: ComplianceCheckResult[] = [];

    checks.push(UsdcCompliance.checkTokenType(tx));
    checks.push(UsdcCompliance.checkChainSupport(tx.chain!));
    checks.push(UsdcCompliance.checkAddressFormat(tx.from, 'sender'));
    checks.push(UsdcCompliance.checkAddressFormat(tx.to, 'recipient'));
    checks.push(UsdcCompliance.checkAmountValid(tx.amount));
    checks.push(UsdcCompliance.checkSanctions(tx.from, 'sender'));
    checks.push(UsdcCompliance.checkSanctions(tx.to, 'recipient'));
    checks.push(UsdcCompliance.checkEnhancedDueDiligence(tx.amount));
    checks.push(UsdcCompliance.checkReportingThreshold(tx.amount));

    const failedChecks = checks.filter((c) => !c.passed);
    const compliant = failedChecks.every((c) => c.severity === 'low');

    const highestSeverity = failedChecks.reduce<AnomalySeverity>(
      (max, c) => {
        const order: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
        return order.indexOf(c.severity) > order.indexOf(max) ? c.severity : max;
      },
      'low',
    );

    const recommendations = UsdcCompliance.generateRecommendations(checks, tx);

    return {
      compliant,
      checks,
      riskLevel: highestSeverity,
      recommendations,
    };
  }

  /**
   * Check whether an address is on the OFAC sanctions list.
   * Performs case-insensitive full address matching.
   *
   * @param address - The Ethereum address to check
   * @returns true if the address is sanctioned
   *
   * @example
   * ```typescript
   * if (UsdcCompliance.isSanctioned('0x722122dF12D4e14e13Ac3b6895a86e84145b6967')) {
   *   console.log('Address is OFAC sanctioned!');
   * }
   * ```
   */
  static isSanctioned(address: string): boolean {
    return SANCTIONED_SET.has(address.toLowerCase());
  }

  /**
   * Perform a detailed sanctions check that returns which list matched.
   *
   * @param address - The Ethereum address to check
   * @returns SanctionsCheckResult with match details
   */
  static checkSanctionsDetailed(address: string): SanctionsCheckResult {
    const lower = address.toLowerCase();
    const isSanctioned = SANCTIONED_SET.has(lower);

    let matchedAddress: string | null = null;
    if (isSanctioned) {
      matchedAddress = SANCTIONED_ADDRESSES.find(
        (a) => a.toLowerCase() === lower,
      ) ?? null;
    }

    return {
      sanctioned: isSanctioned,
      address,
      listMatch: isSanctioned ? SANCTIONS_LIST_ID : null,
      matchedAddress,
    };
  }

  /**
   * Get all known sanctioned addresses.
   *
   * @returns Array of sanctioned addresses
   */
  static getSanctionedAddresses(): string[] {
    return [...SANCTIONED_ADDRESSES];
  }

  /**
   * Get the USDC contract address for a given chain.
   *
   * @param chain - The blockchain network
   * @returns The USDC contract address, or undefined for unsupported chains
   */
  static getContractAddress(chain: Chain): string | undefined {
    return USDC_CONTRACTS[chain];
  }

  /**
   * Get the chains supported for USDC compliance monitoring.
   */
  static getSupportedChains(): Chain[] {
    return Object.keys(USDC_CONTRACTS) as Chain[];
  }

  /**
   * Add new sanctioned addresses at runtime.
   * Normalizes all addresses to lowercase for consistent matching.
   * Skips addresses that are already in the list.
   *
   * @param addresses - Array of Ethereum addresses to add
   * @returns The count of newly added addresses (excluding duplicates)
   */
  static addSanctionedAddresses(addresses: string[]): number {
    let added = 0;
    for (const addr of addresses) {
      const lower = addr.toLowerCase();
      if (!SANCTIONED_SET.has(lower)) {
        SANCTIONED_ADDRESSES.push(addr);
        SANCTIONED_SET.add(lower);
        added++;
      }
    }
    return added;
  }

  /**
   * Replace the entire sanctioned addresses list at runtime.
   * Clears existing entries and rebuilds from the provided array.
   *
   * @param addresses - The new complete list of sanctioned addresses
   */
  static replaceSanctionedAddresses(addresses: string[]): void {
    SANCTIONED_ADDRESSES.length = 0;
    SANCTIONED_ADDRESSES.push(...addresses);
    SANCTIONED_SET.clear();
    for (const addr of addresses) {
      SANCTIONED_SET.add(addr.toLowerCase());
    }
  }

  /**
   * Get the current number of addresses in the sanctions list.
   *
   * @returns The size of the current sanctions list
   */
  static getSanctionsListSize(): number {
    return SANCTIONED_SET.size;
  }

  // --------------------------------------------------------------------------
  // Individual compliance checks
  // --------------------------------------------------------------------------

  private static checkTokenType(tx: LogTransactionInput): ComplianceCheckResult {
    const isUsdc = tx.token === 'USDC';
    return {
      name: 'token_type',
      passed: isUsdc,
      description: isUsdc
        ? 'Transaction token is USDC'
        : `Expected USDC but got ${tx.token}`,
      severity: isUsdc ? 'low' : 'high',
    };
  }

  private static checkChainSupport(chain: Chain): ComplianceCheckResult {
    const supported = chain in USDC_CONTRACTS;
    return {
      name: 'chain_support',
      passed: supported,
      description: supported
        ? `Chain ${chain} is supported for USDC compliance monitoring`
        : `Chain ${chain} is not in the supported USDC compliance list`,
      severity: supported ? 'low' : 'medium',
    };
  }

  private static checkAddressFormat(
    address: string,
    label: string,
  ): ComplianceCheckResult {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
    return {
      name: `address_format_${label}`,
      passed: isValid,
      description: isValid
        ? `${label} address format is valid`
        : `${label} address format is invalid: ${address}`,
      severity: isValid ? 'low' : 'high',
    };
  }

  private static checkAmountValid(amount: string): ComplianceCheckResult {
    const parsed = parseAmount(amount);
    const isValid = !isNaN(parsed) && parsed > 0;
    return {
      name: 'amount_valid',
      passed: isValid,
      description: isValid
        ? `Transaction amount ${amount} is valid`
        : `Transaction amount ${amount} is invalid`,
      severity: isValid ? 'low' : 'critical',
    };
  }

  private static checkSanctions(
    address: string,
    label: string,
  ): ComplianceCheckResult {
    const result = UsdcCompliance.checkSanctionsDetailed(address);

    if (result.sanctioned) {
      console.warn(
        `[Kontext] SANCTIONS WARNING: ${label} address ${address} matches ${result.listMatch} sanctioned address ${result.matchedAddress}`,
      );
    }

    return {
      name: `sanctions_${label}`,
      passed: !result.sanctioned,
      description: result.sanctioned
        ? `${label} address ${address} matches ${result.listMatch} sanctioned address`
        : `${label} address passed sanctions screening`,
      severity: result.sanctioned ? 'critical' : 'low',
    };
  }

  private static checkEnhancedDueDiligence(amount: string): ComplianceCheckResult {
    const parsed = parseAmount(amount);
    const requiresEdd = !isNaN(parsed) && parsed >= ENHANCED_DUE_DILIGENCE_THRESHOLD;

    return {
      name: 'enhanced_due_diligence',
      passed: true, // This is informational -- it always "passes" but flags the need
      description: requiresEdd
        ? `Amount ${amount} USDC requires enhanced due diligence (threshold: ${ENHANCED_DUE_DILIGENCE_THRESHOLD})`
        : `Amount ${amount} USDC is below enhanced due diligence threshold`,
      severity: requiresEdd ? 'medium' : 'low',
    };
  }

  private static checkReportingThreshold(amount: string): ComplianceCheckResult {
    const parsed = parseAmount(amount);
    const requiresReporting = !isNaN(parsed) && parsed >= REPORTING_THRESHOLD;
    const isLarge = !isNaN(parsed) && parsed >= LARGE_TRANSACTION_THRESHOLD;

    let description: string;
    let severity: AnomalySeverity;

    if (isLarge) {
      description = `Amount ${amount} USDC is a large transaction (>= ${LARGE_TRANSACTION_THRESHOLD}) -- requires enhanced monitoring`;
      severity = 'high';
    } else if (requiresReporting) {
      description = `Amount ${amount} USDC meets reporting threshold (>= ${REPORTING_THRESHOLD})`;
      severity = 'medium';
    } else {
      description = `Amount ${amount} USDC is below reporting threshold`;
      severity = 'low';
    }

    return {
      name: 'reporting_threshold',
      passed: true, // Informational
      description,
      severity,
    };
  }

  // --------------------------------------------------------------------------
  // Recommendations
  // --------------------------------------------------------------------------

  private static generateRecommendations(
    checks: ComplianceCheckResult[],
    tx: LogTransactionInput,
  ): string[] {
    const recommendations: string[] = [];
    const amount = parseAmount(tx.amount);

    // Check for failed critical checks
    const criticalFailures = checks.filter(
      (c) => !c.passed && c.severity === 'critical',
    );
    if (criticalFailures.length > 0) {
      recommendations.push('BLOCK: Critical compliance check failures detected. Do not proceed.');
    }

    // Sanctions-specific recommendations
    const sanctionsFailures = checks.filter(
      (c) => c.name.startsWith('sanctions_') && !c.passed,
    );
    if (sanctionsFailures.length > 0) {
      recommendations.push(
        'BLOCK: Address matches OFAC SDN sanctioned entity. Transaction is prohibited under U.S. law.',
      );
    }

    // Amount-based recommendations
    if (!isNaN(amount)) {
      if (amount >= LARGE_TRANSACTION_THRESHOLD) {
        recommendations.push(
          'Require manual review for large transaction per GENIUS Act Section 4(b).',
        );
        recommendations.push('Verify recipient identity through KYC process.');
        recommendations.push('Document business purpose for the transfer.');
      } else if (amount >= REPORTING_THRESHOLD) {
        recommendations.push(
          'Generate Currency Transaction Report (CTR) per BSA requirements.',
        );
        recommendations.push('Retain transaction records for minimum 5 years.');
      } else if (amount >= ENHANCED_DUE_DILIGENCE_THRESHOLD) {
        recommendations.push(
          'Enhanced due diligence recommended -- verify transaction purpose.',
        );
      }
    }

    // Address-based recommendations
    const addressFailures = checks.filter(
      (c) => c.name.startsWith('address_format') && !c.passed,
    );
    if (addressFailures.length > 0) {
      recommendations.push('Verify address format before proceeding.');
    }

    // Default recommendation for clean transactions
    if (recommendations.length === 0) {
      recommendations.push('Transaction passes all compliance checks. Safe to proceed.');
    }

    return recommendations;
  }
}
