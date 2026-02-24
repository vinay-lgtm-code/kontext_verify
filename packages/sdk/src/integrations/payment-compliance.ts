// ============================================================================
// Kontext SDK - General Payment Compliance
// ============================================================================
//
// Compliance checks for general (non-crypto) payments: wire transfers, ACH,
// card payments, and any USD/EUR/GBP flow. Performs name-based OFAC entity
// screening using the full SDN list (18,664 entities from `kontext sync --full`).
//
// Mirrors UsdcCompliance.checkTransaction() pattern and returns the same
// UsdcComplianceCheck type for consistency.
//

import type {
  LogTransactionInput,
  UsdcComplianceCheck,
  ComplianceCheckResult,
  AnomalySeverity,
} from '../types.js';
import { parseAmount } from '../utils.js';
import { UsdcCompliance } from './usdc.js';
import { OFACSanctionsScreener } from './ofac-sanctions.js';

/** Threshold amounts aligned with GENIUS Act / BSA requirements */
const ENHANCED_DUE_DILIGENCE_THRESHOLD = 3000;
const REPORTING_THRESHOLD = 10000;
const LARGE_TRANSACTION_THRESHOLD = 50000;

/** Similarity threshold for name-based OFAC screening (higher = fewer false positives) */
const NAME_MATCH_THRESHOLD = 0.85;

/**
 * General payment compliance checks.
 *
 * Runs OFAC entity name screening (when from/to are names) or address
 * screening (when from/to are blockchain addresses), plus BSA threshold checks.
 *
 * @example
 * ```typescript
 * const check = PaymentCompliance.checkPayment({
 *   amount: '15000',
 *   currency: 'USD',
 *   from: 'Acme Corporation',
 *   to: 'Global Payments Inc',
 *   agentId: 'ap-system',
 *   paymentMethod: 'wire',
 * });
 * if (!check.compliant) {
 *   console.log('Non-compliant:', check.recommendations);
 * }
 * ```
 */
export class PaymentCompliance {
  private static screener = new OFACSanctionsScreener();

  /**
   * Run compliance checks on a general payment.
   *
   * @param input - Payment to evaluate
   * @returns UsdcComplianceCheck with pass/fail results and recommendations
   */
  static checkPayment(input: LogTransactionInput): UsdcComplianceCheck {
    const checks: ComplianceCheckResult[] = [];

    checks.push(PaymentCompliance.checkAmountValid(input.amount));
    checks.push(PaymentCompliance.checkEntityScreening(input.from, 'sender'));
    checks.push(PaymentCompliance.checkEntityScreening(input.to, 'recipient'));
    checks.push(PaymentCompliance.checkEnhancedDueDiligence(input.amount));
    checks.push(PaymentCompliance.checkReportingThreshold(input.amount));

    const failedChecks = checks.filter((c) => !c.passed);
    const compliant = failedChecks.every((c) => c.severity === 'low');

    const highestSeverity = failedChecks.reduce<AnomalySeverity>(
      (max, c) => {
        const order: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
        return order.indexOf(c.severity) > order.indexOf(max) ? c.severity : max;
      },
      'low',
    );

    const recommendations = PaymentCompliance.generateRecommendations(checks, input);

    return {
      compliant,
      checks,
      riskLevel: highestSeverity,
      recommendations,
    };
  }

  // --------------------------------------------------------------------------
  // Individual checks
  // --------------------------------------------------------------------------

  private static checkAmountValid(amount: string): ComplianceCheckResult {
    const parsed = parseAmount(amount);
    const isValid = !isNaN(parsed) && parsed > 0;
    return {
      name: 'amount_valid',
      passed: isValid,
      description: isValid
        ? `Payment amount ${amount} is valid`
        : `Payment amount ${amount} is invalid`,
      severity: isValid ? 'low' : 'critical',
    };
  }

  private static checkEntityScreening(
    entity: string,
    label: string,
  ): ComplianceCheckResult {
    // If it looks like a blockchain address, delegate to address screening
    if (/^0x[a-fA-F0-9]{40}$/.test(entity)) {
      const sanctioned = UsdcCompliance.isSanctioned(entity);
      return {
        name: `entity_screening_${label}`,
        passed: !sanctioned,
        description: sanctioned
          ? `${label} address ${entity} matches OFAC SDN sanctioned address`
          : `${label} address passed sanctions screening`,
        severity: sanctioned ? 'critical' : 'low',
      };
    }

    // Name-based screening via OFACSanctionsScreener fuzzy matching.
    // Filter results: (1) enforce threshold (searchEntityName's substring check can
    // bypass it), (2) require matched name is at least 4 chars to avoid tiny aliases
    // like "SE" or "TIO" matching common business names.
    const rawMatches = PaymentCompliance.screener.searchEntityName(entity, NAME_MATCH_THRESHOLD);
    const matches = rawMatches.filter(
      (m) => m.similarity >= NAME_MATCH_THRESHOLD && m.matchedOn.length >= 4,
    );

    if (matches.length > 0) {
      const topMatch = matches[0]!;
      const isActive = topMatch.entity.list !== 'DELISTED';

      if (isActive) {
        return {
          name: `entity_screening_${label}`,
          passed: false,
          description: `${label} "${entity}" matches OFAC SDN entity "${topMatch.matchedOn}" (${Math.round(topMatch.similarity * 100)}% match)`,
          severity: 'critical',
        };
      }

      // Delisted entity — flag but don't block
      return {
        name: `entity_screening_${label}`,
        passed: true,
        description: `${label} "${entity}" matches delisted entity "${topMatch.matchedOn}" — enhanced due diligence recommended`,
        severity: 'medium',
      };
    }

    return {
      name: `entity_screening_${label}`,
      passed: true,
      description: `${label} "${entity}" passed OFAC entity screening`,
      severity: 'low',
    };
  }

  private static checkEnhancedDueDiligence(amount: string): ComplianceCheckResult {
    const parsed = parseAmount(amount);
    const requiresEdd = !isNaN(parsed) && parsed >= ENHANCED_DUE_DILIGENCE_THRESHOLD;

    return {
      name: 'enhanced_due_diligence',
      passed: true,
      description: requiresEdd
        ? `Amount ${amount} requires enhanced due diligence (threshold: ${ENHANCED_DUE_DILIGENCE_THRESHOLD})`
        : `Amount ${amount} is below enhanced due diligence threshold`,
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
      description = `Amount ${amount} is a large payment (>= ${LARGE_TRANSACTION_THRESHOLD}) — requires enhanced monitoring`;
      severity = 'high';
    } else if (requiresReporting) {
      description = `Amount ${amount} meets reporting threshold (>= ${REPORTING_THRESHOLD})`;
      severity = 'medium';
    } else {
      description = `Amount ${amount} is below reporting threshold`;
      severity = 'low';
    }

    return {
      name: 'reporting_threshold',
      passed: true,
      description,
      severity,
    };
  }

  // --------------------------------------------------------------------------
  // Recommendations
  // --------------------------------------------------------------------------

  private static generateRecommendations(
    checks: ComplianceCheckResult[],
    input: LogTransactionInput,
  ): string[] {
    const recommendations: string[] = [];
    const amount = parseAmount(input.amount);

    for (const check of checks) {
      if (!check.passed && check.name.startsWith('entity_screening_')) {
        recommendations.push(
          `BLOCK: ${check.description}. Payment is prohibited under OFAC regulations.`,
        );
      }
    }

    if (!isNaN(amount) && amount >= LARGE_TRANSACTION_THRESHOLD) {
      recommendations.push(
        `Enhanced monitoring required for payment of ${input.amount} ${input.currency ?? 'USD'} (above ${LARGE_TRANSACTION_THRESHOLD} threshold).`,
      );
    }

    if (!isNaN(amount) && amount >= REPORTING_THRESHOLD) {
      recommendations.push(
        `CTR reporting may be required for payment of ${input.amount} ${input.currency ?? 'USD'} (meets ${REPORTING_THRESHOLD} reporting threshold).`,
      );
    }

    if (!isNaN(amount) && amount >= ENHANCED_DUE_DILIGENCE_THRESHOLD) {
      recommendations.push(
        `Enhanced due diligence recommended for payment of ${input.amount} ${input.currency ?? 'USD'} (Travel Rule threshold: ${ENHANCED_DUE_DILIGENCE_THRESHOLD}).`,
      );
    }

    return recommendations;
  }
}
