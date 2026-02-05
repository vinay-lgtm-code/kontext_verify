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
const USDC_DECIMALS = 6;

/** OFAC/sanctions-related blocked address patterns (example -- in production these come from an API) */
const BLOCKED_ADDRESS_PREFIXES: string[] = [
  // These are examples. Real implementation would query an OFAC API.
];

/** Threshold amounts that trigger enhanced due diligence (GENIUS Act aligned) */
const ENHANCED_DUE_DILIGENCE_THRESHOLD = 3000;
const REPORTING_THRESHOLD = 10000;
const LARGE_TRANSACTION_THRESHOLD = 50000;

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
 * - Sanctions screening (placeholder for OFAC integration)
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
    checks.push(UsdcCompliance.checkChainSupport(tx.chain));
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
    // In production, this would query an OFAC/sanctions API.
    // For MVP, we check against a local blocklist.
    const isBlocked = BLOCKED_ADDRESS_PREFIXES.some((prefix) =>
      address.toLowerCase().startsWith(prefix.toLowerCase()),
    );

    return {
      name: `sanctions_${label}`,
      passed: !isBlocked,
      description: isBlocked
        ? `${label} address ${address} appears on sanctions list`
        : `${label} address passed sanctions screening`,
      severity: isBlocked ? 'critical' : 'low',
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
