// ============================================================================
// Kontext SDK - ACH Payment Compliance
// ============================================================================
//
// Compliance checks for ACH payments initiated by autonomous agents.
// Validates NACHA originator fields, SEC codes, routing number checksums,
// same-day ACH limits, and BSA thresholds. Performs name-based OFAC entity
// screening on originator and receiver.
//
// Returns the same UsdcComplianceCheck type for consistency across all rails.
//

import type {
  LogTransactionInput,
  UsdcComplianceCheck,
  ComplianceCheckResult,
  AnomalySeverity,
} from '../types.js';
import { parseAmount } from '../utils.js';
import { UsdcCompliance } from './usdc.js';

/** Threshold amounts aligned with GENIUS Act / BSA requirements */
const ENHANCED_DUE_DILIGENCE_THRESHOLD = 3000;
const REPORTING_THRESHOLD = 10000;
const LARGE_TRANSACTION_THRESHOLD = 50000;

/** Same-day ACH per-entry limit (NACHA) */
const SAME_DAY_ACH_LIMIT = 1000000;

/** Valid NACHA Standard Entry Class codes */
const VALID_SEC_CODES = new Set([
  'PPD', 'CCD', 'WEB', 'TEL', 'IAT', 'CTX', 'RCK', 'ARC', 'BOC', 'POP',
  'ACK', 'ATX', 'ADV', 'DNE', 'ENR', 'TRC', 'TRX', 'XCK',
]);

/** Similarity threshold for name-based OFAC screening */
const NAME_MATCH_THRESHOLD = 0.85;

/** Lazy-loaded screener — same pattern as PaymentCompliance */
interface EntityScreenResult {
  entity: { list: string };
  similarity: number;
  matchedOn: string;
}
interface EntityScreener {
  searchEntityName(query: string, threshold: number): EntityScreenResult[];
}

let _screener: EntityScreener | null = null;
let _screenerLoaded = false;

function getScreener(): EntityScreener | null {
  if (!_screenerLoaded) {
    _screenerLoaded = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./ofac-sanctions.js');
      if (mod.OFACSanctionsScreener) {
        _screener = new mod.OFACSanctionsScreener();
      }
    } catch {
      // ofac-sanctions module not available — name screening disabled
    }
  }
  return _screener;
}

export class AchCompliance {

  /**
   * Run compliance checks on an ACH payment.
   */
  static checkPayment(input: LogTransactionInput): UsdcComplianceCheck {
    const checks: ComplianceCheckResult[] = [];

    checks.push(AchCompliance.checkAmountValid(input.amount));
    checks.push(AchCompliance.checkEntityScreening(input.achOriginatorName ?? input.from, 'originator'));
    checks.push(AchCompliance.checkEntityScreening(input.to, 'receiver'));
    checks.push(AchCompliance.checkSecCode(input.achSecCode));
    checks.push(AchCompliance.checkOdfiRouting(input.achOdfiRoutingNumber));
    checks.push(AchCompliance.checkSameDayLimit(input.achSameDay, input.amount));
    checks.push(AchCompliance.checkEnhancedDueDiligence(input.amount));
    checks.push(AchCompliance.checkReportingThreshold(input.amount));
    checks.push(AchCompliance.checkIatScreening(input.achSecCode));
    checks.push(AchCompliance.checkPrefundingAdequacy(input.achPrefundingBalance, input.amount));

    const failedChecks = checks.filter((c) => !c.passed);
    const compliant = failedChecks.every((c) => c.severity === 'low');

    const highestSeverity = failedChecks.reduce<AnomalySeverity>(
      (max, c) => {
        const order: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
        return order.indexOf(c.severity) > order.indexOf(max) ? c.severity : max;
      },
      'low',
    );

    const recommendations = AchCompliance.generateRecommendations(checks, input);

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
        ? `ACH payment amount ${amount} is valid`
        : `ACH payment amount ${amount} is invalid`,
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

    const screener = getScreener();
    if (!screener) {
      return {
        name: `entity_screening_${label}`,
        passed: true,
        description: `${label} "${entity}" — name-based OFAC screening not available (address screening active)`,
        severity: 'low',
      };
    }

    const rawMatches = screener.searchEntityName(entity, NAME_MATCH_THRESHOLD);
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

  static checkSecCode(secCode?: string): ComplianceCheckResult {
    if (!secCode) {
      return {
        name: 'sec_code_valid',
        passed: true,
        description: 'No SEC code provided — skipping SEC code validation',
        severity: 'low',
      };
    }

    const upper = secCode.toUpperCase();
    if (VALID_SEC_CODES.has(upper)) {
      return {
        name: 'sec_code_valid',
        passed: true,
        description: `SEC code ${upper} is valid`,
        severity: 'low',
      };
    }

    return {
      name: 'sec_code_valid',
      passed: false,
      description: `SEC code "${secCode}" is not a valid NACHA Standard Entry Class code`,
      severity: 'high',
    };
  }

  static checkOdfiRouting(routingNumber?: string): ComplianceCheckResult {
    if (!routingNumber) {
      return {
        name: 'odfi_routing_format',
        passed: true,
        description: 'No ODFI routing number provided — skipping validation',
        severity: 'low',
      };
    }

    if (!/^\d{9}$/.test(routingNumber)) {
      return {
        name: 'odfi_routing_format',
        passed: false,
        description: `ODFI routing number "${routingNumber}" must be exactly 9 digits`,
        severity: 'high',
      };
    }

    if (!AchCompliance.validateRoutingChecksum(routingNumber)) {
      return {
        name: 'odfi_routing_format',
        passed: false,
        description: `ODFI routing number "${routingNumber}" fails mod-10 checksum validation`,
        severity: 'high',
      };
    }

    return {
      name: 'odfi_routing_format',
      passed: true,
      description: `ODFI routing number ${routingNumber} is valid`,
      severity: 'low',
    };
  }

  private static checkSameDayLimit(sameDay?: boolean, amount?: string): ComplianceCheckResult {
    if (!sameDay) {
      return {
        name: 'same_day_ach_limit',
        passed: true,
        description: 'Not a same-day ACH entry — limit check not applicable',
        severity: 'low',
      };
    }

    const parsed = amount ? parseAmount(amount) : 0;
    if (!isNaN(parsed) && parsed > SAME_DAY_ACH_LIMIT) {
      return {
        name: 'same_day_ach_limit',
        passed: false,
        description: `Same-day ACH amount ${amount} exceeds per-entry limit of $${SAME_DAY_ACH_LIMIT.toLocaleString()}`,
        severity: 'high',
      };
    }

    return {
      name: 'same_day_ach_limit',
      passed: true,
      description: `Same-day ACH amount ${amount} is within per-entry limit`,
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
        ? `ACH payment ${amount} requires enhanced due diligence (Travel Rule threshold: ${ENHANCED_DUE_DILIGENCE_THRESHOLD})`
        : `ACH payment ${amount} is below enhanced due diligence threshold`,
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
      description = `ACH payment ${amount} is a large transaction (>= ${LARGE_TRANSACTION_THRESHOLD}) — requires enhanced monitoring`;
      severity = 'high';
    } else if (requiresReporting) {
      description = `ACH payment ${amount} meets CTR reporting threshold (>= ${REPORTING_THRESHOLD})`;
      severity = 'medium';
    } else {
      description = `ACH payment ${amount} is below reporting threshold`;
      severity = 'low';
    }

    return {
      name: 'reporting_threshold',
      passed: true,
      description,
      severity,
    };
  }

  private static checkIatScreening(secCode?: string): ComplianceCheckResult {
    if (!secCode || secCode.toUpperCase() !== 'IAT') {
      return {
        name: 'iat_screening',
        passed: true,
        description: 'Not an International ACH Transaction — IAT screening not required',
        severity: 'low',
      };
    }

    return {
      name: 'iat_screening',
      passed: true,
      description: 'International ACH Transaction (IAT) detected — enhanced OFAC screening and recordkeeping required per NACHA and FinCEN guidelines',
      severity: 'medium',
    };
  }

  private static checkPrefundingAdequacy(
    prefundingBalance?: string,
    amount?: string,
  ): ComplianceCheckResult {
    if (!prefundingBalance) {
      return {
        name: 'prefunding_adequacy',
        passed: true,
        description: 'No prefunding balance provided — skipping adequacy check',
        severity: 'low',
      };
    }

    const balance = parseAmount(prefundingBalance);
    const txAmount = amount ? parseAmount(amount) : 0;

    if (isNaN(balance) || isNaN(txAmount)) {
      return {
        name: 'prefunding_adequacy',
        passed: true,
        description: 'Unable to parse prefunding balance or amount — skipping',
        severity: 'low',
      };
    }

    if (balance < txAmount) {
      return {
        name: 'prefunding_adequacy',
        passed: false,
        description: `Prefunding balance ${prefundingBalance} is insufficient for ACH payment of ${amount}`,
        severity: 'high',
      };
    }

    return {
      name: 'prefunding_adequacy',
      passed: true,
      description: `Prefunding balance ${prefundingBalance} covers ACH payment of ${amount}`,
      severity: 'low',
    };
  }

  // --------------------------------------------------------------------------
  // Routing number validation
  // --------------------------------------------------------------------------

  /**
   * Validate an ABA routing number using the NACHA mod-10 checksum algorithm.
   * Weights: [3, 7, 1, 3, 7, 1, 3, 7, 1]
   */
  static validateRoutingChecksum(routingNumber: string): boolean {
    if (!/^\d{9}$/.test(routingNumber)) return false;

    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(routingNumber[i]!, 10) * weights[i]!;
    }
    return sum % 10 === 0;
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
      if (!check.passed && check.name === 'sec_code_valid') {
        recommendations.push(
          `REJECT: ${check.description}. Use a valid NACHA SEC code (PPD, CCD, WEB, TEL, IAT, CTX).`,
        );
      }
      if (!check.passed && check.name === 'odfi_routing_format') {
        recommendations.push(
          `REJECT: ${check.description}. Verify the ODFI routing number with your banking provider.`,
        );
      }
      if (!check.passed && check.name === 'same_day_ach_limit') {
        recommendations.push(
          `REJECT: ${check.description}. Split into multiple entries or use next-day ACH.`,
        );
      }
      if (!check.passed && check.name === 'prefunding_adequacy') {
        recommendations.push(
          `HOLD: ${check.description}. Ensure sufficient funds before batch submission.`,
        );
      }
    }

    if (!isNaN(amount) && amount >= LARGE_TRANSACTION_THRESHOLD) {
      recommendations.push(
        `Enhanced monitoring required for ACH payment of ${input.amount} ${input.currency ?? 'USD'} (above ${LARGE_TRANSACTION_THRESHOLD} threshold).`,
      );
    }

    if (!isNaN(amount) && amount >= REPORTING_THRESHOLD) {
      recommendations.push(
        `CTR reporting may be required for ACH payment of ${input.amount} ${input.currency ?? 'USD'} (meets ${REPORTING_THRESHOLD} reporting threshold).`,
      );
    }

    if (!isNaN(amount) && amount >= ENHANCED_DUE_DILIGENCE_THRESHOLD) {
      recommendations.push(
        `Enhanced due diligence recommended for ACH payment of ${input.amount} ${input.currency ?? 'USD'} (Travel Rule threshold: ${ENHANCED_DUE_DILIGENCE_THRESHOLD}).`,
      );
    }

    if (input.achSecCode?.toUpperCase() === 'IAT') {
      recommendations.push(
        'International ACH Transaction (IAT): ensure originator/beneficiary information meets OFAC and FinCEN requirements.',
      );
    }

    return recommendations;
  }
}
