// ============================================================================
// Kontext SDK - Card Payment Compliance
// ============================================================================
//
// Compliance checks for agent virtual card payments: Ramp Agent Cards,
// Crossmint/Lobster.cash scoped cards, Lithic/Marqeta-issued cards, and any
// card-network payment made by an autonomous agent.
//
// Extends the same BSA threshold checks as PaymentCompliance and adds
// card-specific checks: MCC risk classification, 3DS verification status,
// instrument scope validation, and merchant country screening.
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

/** High-risk Merchant Category Codes (ISO 18245) */
const HIGH_RISK_MCCS: Record<string, string> = {
  '6012': 'Financial Institutions — Merchandise/Services',
  '6051': 'Quasi-Cash — Crypto Exchanges, Money Orders',
  '6211': 'Securities Brokers/Dealers',
  '5967': 'Direct Marketing — Inbound Telemarketing',
  '7995': 'Gambling — Lotteries, Casino Chips, Wagers',
  '5962': 'Direct Marketing — Travel',
  '5966': 'Direct Marketing — Outbound Telemarketing',
};

/** OFAC comprehensively sanctioned countries (ISO 3166-1 alpha-2) */
const SANCTIONED_COUNTRIES = new Set([
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
  'UA', // Crimea region (treated as sanctioned territory under UA)
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

export class CardCompliance {

  /**
   * Run compliance checks on a card payment.
   */
  static checkPayment(input: LogTransactionInput): UsdcComplianceCheck {
    const checks: ComplianceCheckResult[] = [];

    checks.push(CardCompliance.checkAmountValid(input.amount));
    checks.push(CardCompliance.checkEntityScreening(input.merchantName ?? input.to, 'merchant'));
    checks.push(CardCompliance.checkEntityScreening(input.from, 'cardholder'));
    checks.push(CardCompliance.checkEnhancedDueDiligence(input.amount));
    checks.push(CardCompliance.checkReportingThreshold(input.amount));
    checks.push(CardCompliance.checkMerchantCategory(input.merchantCategoryCode));
    checks.push(CardCompliance.checkThreeDSecure(input.threeDSecureStatus, input.amount));
    checks.push(CardCompliance.checkInstrumentScope(input));
    checks.push(CardCompliance.checkMerchantCountry(input.merchantCountry));

    const failedChecks = checks.filter((c) => !c.passed);
    const compliant = failedChecks.every((c) => c.severity === 'low');

    const highestSeverity = failedChecks.reduce<AnomalySeverity>(
      (max, c) => {
        const order: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
        return order.indexOf(c.severity) > order.indexOf(max) ? c.severity : max;
      },
      'low',
    );

    const recommendations = CardCompliance.generateRecommendations(checks, input);

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
        ? `Card payment amount ${amount} is valid`
        : `Card payment amount ${amount} is invalid`,
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

  private static checkEnhancedDueDiligence(amount: string): ComplianceCheckResult {
    const parsed = parseAmount(amount);
    const requiresEdd = !isNaN(parsed) && parsed >= ENHANCED_DUE_DILIGENCE_THRESHOLD;

    return {
      name: 'enhanced_due_diligence',
      passed: true,
      description: requiresEdd
        ? `Card payment ${amount} requires enhanced due diligence (Travel Rule threshold: ${ENHANCED_DUE_DILIGENCE_THRESHOLD})`
        : `Card payment ${amount} is below enhanced due diligence threshold`,
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
      description = `Card payment ${amount} is a large transaction (>= ${LARGE_TRANSACTION_THRESHOLD}) — requires enhanced monitoring`;
      severity = 'high';
    } else if (requiresReporting) {
      description = `Card payment ${amount} meets CTR reporting threshold (>= ${REPORTING_THRESHOLD})`;
      severity = 'medium';
    } else {
      description = `Card payment ${amount} is below reporting threshold`;
      severity = 'low';
    }

    return {
      name: 'reporting_threshold',
      passed: true,
      description,
      severity,
    };
  }

  static checkMerchantCategory(mcc?: string): ComplianceCheckResult {
    if (!mcc) {
      return {
        name: 'merchant_category',
        passed: true,
        description: 'No merchant category code provided — skipping MCC check',
        severity: 'low',
      };
    }

    const riskDescription = HIGH_RISK_MCCS[mcc];
    if (riskDescription) {
      return {
        name: 'merchant_category',
        passed: true, // Warning, not blocking
        description: `High-risk MCC ${mcc}: ${riskDescription} — enhanced monitoring recommended`,
        severity: 'medium',
      };
    }

    return {
      name: 'merchant_category',
      passed: true,
      description: `MCC ${mcc} is not flagged as high-risk`,
      severity: 'low',
    };
  }

  static checkThreeDSecure(
    status?: string,
    amount?: string,
  ): ComplianceCheckResult {
    if (!status || status === 'none') {
      const parsed = amount ? parseAmount(amount) : 0;
      if (!isNaN(parsed) && parsed >= ENHANCED_DUE_DILIGENCE_THRESHOLD) {
        return {
          name: 'three_d_secure',
          passed: false,
          description: `3D Secure not verified for card payment >= ${ENHANCED_DUE_DILIGENCE_THRESHOLD} — authentication required`,
          severity: 'high',
        };
      }
      return {
        name: 'three_d_secure',
        passed: true,
        description: '3D Secure not provided — below threshold, accepted',
        severity: 'low',
      };
    }

    if (status === 'authenticated') {
      return {
        name: 'three_d_secure',
        passed: true,
        description: '3D Secure authentication verified',
        severity: 'low',
      };
    }

    if (status === 'attempted') {
      return {
        name: 'three_d_secure',
        passed: true,
        description: '3D Secure authentication attempted but not fully verified — liability shift may not apply',
        severity: 'medium',
      };
    }

    // 'failed' or 'not_enrolled'
    const parsed = amount ? parseAmount(amount) : 0;
    if (!isNaN(parsed) && parsed >= ENHANCED_DUE_DILIGENCE_THRESHOLD) {
      return {
        name: 'three_d_secure',
        passed: false,
        description: `3D Secure ${status} for card payment >= ${ENHANCED_DUE_DILIGENCE_THRESHOLD} — authentication required`,
        severity: 'high',
      };
    }

    return {
      name: 'three_d_secure',
      passed: true,
      description: `3D Secure ${status} — below threshold, accepted with warning`,
      severity: 'medium',
    };
  }

  static checkInstrumentScope(input: LogTransactionInput): ComplianceCheckResult {
    const scope = input.instrument?.instrumentScope ?? (input.cardSpendLimit ? {
      spendLimit: input.cardSpendLimit,
    } : undefined);

    if (!scope) {
      return {
        name: 'instrument_scope',
        passed: true,
        description: 'No instrument scope provided — skipping scope validation',
        severity: 'low',
      };
    }

    const parsed = parseAmount(input.amount);
    const violations: string[] = [];

    // Check per-transaction limit
    if (scope.maxTransactionAmount) {
      const maxTx = parseAmount(scope.maxTransactionAmount);
      if (!isNaN(parsed) && !isNaN(maxTx) && parsed > maxTx) {
        violations.push(`Amount ${input.amount} exceeds max transaction limit ${scope.maxTransactionAmount}`);
      }
    }

    // Check spend limit
    if (scope.spendLimit) {
      const limit = parseAmount(scope.spendLimit);
      if (!isNaN(parsed) && !isNaN(limit) && parsed > limit) {
        violations.push(`Amount ${input.amount} exceeds ${scope.spendLimitPeriod ?? 'period'} spend limit ${scope.spendLimit}`);
      }
    }

    // Check blocked merchant categories
    if (scope.blockedMerchantCategories && input.merchantCategoryCode) {
      if (scope.blockedMerchantCategories.includes(input.merchantCategoryCode)) {
        violations.push(`MCC ${input.merchantCategoryCode} is blocked by instrument scope`);
      }
    }

    // Check allowed currencies
    if (scope.allowedCurrencies && input.currency) {
      if (!scope.allowedCurrencies.includes(input.currency)) {
        violations.push(`Currency ${input.currency} is not in allowed currencies: ${scope.allowedCurrencies.join(', ')}`);
      }
    }

    // Check allowed countries
    if (scope.allowedCountries && input.merchantCountry) {
      if (!scope.allowedCountries.includes(input.merchantCountry)) {
        violations.push(`Merchant country ${input.merchantCountry} is not in allowed countries`);
      }
    }

    // Check expiry
    if (scope.expiresAt) {
      const expiry = new Date(scope.expiresAt);
      if (expiry.getTime() < Date.now()) {
        violations.push(`Instrument expired at ${scope.expiresAt}`);
      }
    }

    if (violations.length > 0) {
      return {
        name: 'instrument_scope',
        passed: false,
        description: `Instrument scope violations: ${violations.join('; ')}`,
        severity: 'high',
      };
    }

    return {
      name: 'instrument_scope',
      passed: true,
      description: 'Payment is within instrument scope constraints',
      severity: 'low',
    };
  }

  static checkMerchantCountry(country?: string): ComplianceCheckResult {
    if (!country) {
      return {
        name: 'merchant_country',
        passed: true,
        description: 'No merchant country provided — skipping country check',
        severity: 'low',
      };
    }

    const upperCountry = country.toUpperCase();
    if (SANCTIONED_COUNTRIES.has(upperCountry)) {
      return {
        name: 'merchant_country',
        passed: false,
        description: `Merchant country ${upperCountry} is under comprehensive OFAC sanctions — payment prohibited`,
        severity: 'critical',
      };
    }

    return {
      name: 'merchant_country',
      passed: true,
      description: `Merchant country ${upperCountry} is not sanctioned`,
      severity: 'low',
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
      if (!check.passed && check.name === 'merchant_country') {
        recommendations.push(
          `BLOCK: ${check.description}`,
        );
      }
      if (!check.passed && check.name === 'three_d_secure') {
        recommendations.push(
          `REQUIRE 3DS: ${check.description}`,
        );
      }
      if (!check.passed && check.name === 'instrument_scope') {
        recommendations.push(
          `SCOPE VIOLATION: ${check.description}`,
        );
      }
    }

    if (!isNaN(amount) && amount >= LARGE_TRANSACTION_THRESHOLD) {
      recommendations.push(
        `Enhanced monitoring required for card payment of ${input.amount} ${input.currency ?? 'USD'} (above ${LARGE_TRANSACTION_THRESHOLD} threshold).`,
      );
    }

    if (!isNaN(amount) && amount >= REPORTING_THRESHOLD) {
      recommendations.push(
        `CTR reporting may be required for card payment of ${input.amount} ${input.currency ?? 'USD'} (meets ${REPORTING_THRESHOLD} reporting threshold).`,
      );
    }

    if (!isNaN(amount) && amount >= ENHANCED_DUE_DILIGENCE_THRESHOLD) {
      recommendations.push(
        `Enhanced due diligence recommended for card payment of ${input.amount} ${input.currency ?? 'USD'} (Travel Rule threshold: ${ENHANCED_DUE_DILIGENCE_THRESHOLD}).`,
      );
    }

    const mcc = input.merchantCategoryCode;
    if (mcc && HIGH_RISK_MCCS[mcc]) {
      recommendations.push(
        `High-risk merchant category: MCC ${mcc} (${HIGH_RISK_MCCS[mcc]}). Consider additional review.`,
      );
    }

    return recommendations;
  }
}
