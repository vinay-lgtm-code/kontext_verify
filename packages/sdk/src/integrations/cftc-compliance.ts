// ============================================================================
// Kontext SDK - CFTC Compliance Integration
// ============================================================================
//
// Implements compliance tooling for CFTC Letter No. 26-05 (Feb 6, 2026) which
// permits FCMs (Futures Commission Merchants) to accept stablecoins and digital
// assets as customer margin collateral.
//
// This module provides:
// - Collateral valuation logging with haircut validation
// - Daily segregation calculation tracking (Reg 1.20 / 30.7)
// - Weekly digital asset reporting
// - Incident reporting (cybersecurity, operational, system failures)
// - Export capabilities for regulatory submission
//
// Haircut rules per CFTC Letter 26-05:
// - Payment stablecoins: no mandatory minimum haircut
// - BTC / ETH: deferred to DCO (Derivatives Clearing Organization) schedule
// - Other digital assets: minimum 20% haircut
// ============================================================================

import { generateId, now, toCsv } from '../utils.js';

// ============================================================================
// Types
// ============================================================================

/** CFTC account classification for segregated funds */
export type CFTCAccountClass = 'futures' | 'cleared_swaps' | '30.7';

/** Digital asset classification per CFTC Letter 26-05 */
export type DigitalAssetType = 'payment_stablecoin' | 'btc' | 'eth' | 'other_digital_asset';

/** Collateral valuation record for a digital asset held as customer margin */
export interface CollateralValuation {
  /** Unique valuation ID */
  id: string;
  /** ISO 8601 timestamp of the valuation */
  timestamp: string;
  /** CFTC account class (futures, cleared_swaps, 30.7) */
  accountClass: CFTCAccountClass;
  /** Type of digital asset */
  assetType: DigitalAssetType;
  /** Asset symbol (e.g., USDC, BTC, ETH) */
  assetSymbol: string;
  /** Quantity of asset held */
  quantity: number;
  /** Market value in USD */
  marketValue: number;
  /** Haircut percentage applied (0.0 - 1.0) */
  haircutPercentage: number;
  /** Absolute haircut value in USD */
  haircutValue: number;
  /** Net collateral value after haircut (marketValue - haircutValue) */
  netValue: number;
  /** DCO reference for the haircut schedule (optional) */
  dcoReference?: string;
  /** Valuation methodology */
  valuationMethod: string;
  /** Agent that performed the valuation */
  agentId: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Daily segregation calculation per CFTC Reg 1.20 / 30.7 */
export interface SegregationCalculation {
  /** Unique calculation ID */
  id: string;
  /** ISO 8601 timestamp of the calculation */
  timestamp: string;
  /** CFTC account class */
  accountClass: CFTCAccountClass;
  /** Total customer funds on deposit */
  totalCustomerFunds: number;
  /** Required segregated amount */
  requiredAmount: number;
  /** Excess (positive) or deficit (negative) */
  excessDeficit: number;
  /** Breakdown of digital assets in the segregation calculation */
  digitalAssetBreakdown: Array<{
    assetType: DigitalAssetType;
    assetSymbol: string;
    quantity: number;
    marketValue: number;
    haircutValue: number;
    netValue: number;
  }>;
  /** Residual interest amount */
  residualInterest: number;
  /** Agent that performed the calculation */
  agentId: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Weekly digital asset report aggregating collateral positions */
export interface DigitalAssetReport {
  /** Unique report ID */
  id: string;
  /** Date the report was generated (ISO 8601 date string) */
  reportDate: string;
  /** Start of the reporting period (ISO 8601) */
  reportPeriodStart: string;
  /** End of the reporting period (ISO 8601) */
  reportPeriodEnd: string;
  /** CFTC account class */
  accountClass: CFTCAccountClass;
  /** Aggregated asset positions */
  assets: Array<{
    assetType: DigitalAssetType;
    assetSymbol: string;
    totalQuantity: number;
    totalMarketValue: number;
    totalHaircutValue: number;
    totalNetValue: number;
  }>;
  /** Sum of all asset market values */
  totalMarketValue: number;
  /** Sum of all asset net values (after haircuts) */
  totalNetValue: number;
  /** ISO 8601 timestamp when the report was generated */
  generatedAt: string;
}

/** Incident report for cybersecurity or operational events */
export interface IncidentReport {
  /** Unique incident ID */
  id: string;
  /** ISO 8601 timestamp of the incident */
  timestamp: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Type of incident */
  incidentType: 'cybersecurity' | 'operational' | 'system_failure' | 'disruption';
  /** Description of the incident */
  description: string;
  /** Systems affected by the incident */
  affectedSystems: string[];
  /** Number of customers affected (optional) */
  affectedCustomerCount?: number;
  /** Financial impact in USD (optional) */
  financialImpact?: number;
  /** Current resolution status */
  resolutionStatus: 'open' | 'investigating' | 'resolved';
  /** Agent that reported the incident */
  agentId: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Configuration options for the CFTC compliance module */
export interface CFTCComplianceConfig {
  /** Minimum haircut for non-BTC/ETH, non-stablecoin digital assets (default 0.20) */
  minimumNonBtcEthHaircut?: number;
  /** Whether to enforce haircut validation on collateral logging (default true) */
  enableHaircutValidation?: boolean;
  /** Whether to enable weekly reporting features */
  enableWeeklyReporting?: boolean;
  /** Date from which to start generating reports */
  reportingStartDate?: Date;
}

/** Result of a haircut validation check */
export interface HaircutValidationResult {
  /** Whether the haircut meets the minimum requirement */
  valid: boolean;
  /** The minimum required haircut for this asset type */
  minimumRequired: number;
  /** Human-readable explanation */
  message: string;
}

// ============================================================================
// CFTCCompliance Class
// ============================================================================

/**
 * CFTC compliance module for FCM digital asset margin requirements.
 *
 * Implements the record-keeping and reporting requirements introduced by
 * CFTC Letter No. 26-05 (Feb 6, 2026), which permits FCMs to accept
 * stablecoins and digital assets as customer margin collateral.
 *
 * @example
 * ```typescript
 * const cftc = new CFTCCompliance();
 *
 * // Log a collateral valuation
 * const valuation = cftc.logCollateralValuation({
 *   accountClass: 'futures',
 *   assetType: 'payment_stablecoin',
 *   assetSymbol: 'USDC',
 *   quantity: 1_000_000,
 *   marketValue: 1_000_000,
 *   haircutPercentage: 0.02,
 *   haircutValue: 20_000,
 *   netValue: 980_000,
 *   valuationMethod: 'mark_to_market',
 *   agentId: 'margin-agent-1',
 * });
 *
 * // Generate a weekly report
 * const report = cftc.generateWeeklyDigitalAssetReport(
 *   'futures',
 *   new Date('2026-02-01'),
 *   new Date('2026-02-07'),
 * );
 * ```
 */
export class CFTCCompliance {
  private readonly config: Required<Omit<CFTCComplianceConfig, 'reportingStartDate'>> & {
    reportingStartDate?: Date;
  };

  private collateralValuations: CollateralValuation[] = [];
  private segregationCalculations: SegregationCalculation[] = [];
  private incidents: IncidentReport[] = [];

  constructor(config?: CFTCComplianceConfig) {
    this.config = {
      minimumNonBtcEthHaircut: config?.minimumNonBtcEthHaircut ?? 0.20,
      enableHaircutValidation: config?.enableHaircutValidation ?? true,
      enableWeeklyReporting: config?.enableWeeklyReporting ?? false,
      reportingStartDate: config?.reportingStartDate,
    };
  }

  // --------------------------------------------------------------------------
  // Collateral Valuation
  // --------------------------------------------------------------------------

  /**
   * Log a collateral valuation for a digital asset held as customer margin.
   *
   * Validates the haircut percentage against CFTC requirements when
   * `enableHaircutValidation` is true (default).
   *
   * @param input - Collateral valuation data (id and timestamp are auto-generated if omitted)
   * @returns The stored CollateralValuation record
   * @throws Error if haircut validation fails for the given asset type
   */
  logCollateralValuation(
    input: Omit<CollateralValuation, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
  ): CollateralValuation {
    // Validate haircut if enabled
    if (this.config.enableHaircutValidation) {
      const validation = this.validateHaircut(input.assetType, input.haircutPercentage);
      if (!validation.valid) {
        throw new Error(
          `Haircut validation failed: ${validation.message}`,
        );
      }
    }

    const valuation: CollateralValuation = {
      id: input.id ?? generateId(),
      timestamp: input.timestamp ?? now(),
      accountClass: input.accountClass,
      assetType: input.assetType,
      assetSymbol: input.assetSymbol,
      quantity: input.quantity,
      marketValue: input.marketValue,
      haircutPercentage: input.haircutPercentage,
      haircutValue: input.haircutValue,
      netValue: input.netValue,
      valuationMethod: input.valuationMethod,
      agentId: input.agentId,
      ...(input.dcoReference !== undefined && { dcoReference: input.dcoReference }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    };

    this.collateralValuations.push(valuation);
    return valuation;
  }

  // --------------------------------------------------------------------------
  // Segregation Calculations
  // --------------------------------------------------------------------------

  /**
   * Log a daily segregation calculation for a given account class.
   *
   * @param input - Segregation calculation data (id and timestamp are auto-generated if omitted)
   * @returns The stored SegregationCalculation record
   */
  logSegregationCalculation(
    input: Omit<SegregationCalculation, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
  ): SegregationCalculation {
    const calculation: SegregationCalculation = {
      id: input.id ?? generateId(),
      timestamp: input.timestamp ?? now(),
      accountClass: input.accountClass,
      totalCustomerFunds: input.totalCustomerFunds,
      requiredAmount: input.requiredAmount,
      excessDeficit: input.excessDeficit,
      digitalAssetBreakdown: input.digitalAssetBreakdown,
      residualInterest: input.residualInterest,
      agentId: input.agentId,
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    };

    this.segregationCalculations.push(calculation);
    return calculation;
  }

  // --------------------------------------------------------------------------
  // Incident Reporting
  // --------------------------------------------------------------------------

  /**
   * Log an incident (cybersecurity, operational, system failure, or disruption).
   *
   * @param input - Incident data (id and timestamp are auto-generated if omitted)
   * @returns The stored IncidentReport record
   */
  logIncident(
    input: Omit<IncidentReport, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
  ): IncidentReport {
    const incident: IncidentReport = {
      id: input.id ?? generateId(),
      timestamp: input.timestamp ?? now(),
      severity: input.severity,
      incidentType: input.incidentType,
      description: input.description,
      affectedSystems: input.affectedSystems,
      resolutionStatus: input.resolutionStatus,
      agentId: input.agentId,
      ...(input.affectedCustomerCount !== undefined && {
        affectedCustomerCount: input.affectedCustomerCount,
      }),
      ...(input.financialImpact !== undefined && {
        financialImpact: input.financialImpact,
      }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    };

    this.incidents.push(incident);
    return incident;
  }

  // --------------------------------------------------------------------------
  // Report Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a weekly digital asset report aggregating collateral valuations
   * for a given account class and date range.
   *
   * @param accountClass - The CFTC account class to report on
   * @param periodStart - Start of the reporting period
   * @param periodEnd - End of the reporting period
   * @returns DigitalAssetReport with aggregated positions
   */
  generateWeeklyDigitalAssetReport(
    accountClass: CFTCAccountClass,
    periodStart: Date,
    periodEnd: Date,
  ): DigitalAssetReport {
    // Filter valuations for the period and account class
    const filtered = this.collateralValuations.filter((v) => {
      const ts = new Date(v.timestamp);
      return (
        v.accountClass === accountClass &&
        ts >= periodStart &&
        ts <= periodEnd
      );
    });

    // Aggregate by assetType + assetSymbol
    const aggregationMap = new Map<
      string,
      {
        assetType: DigitalAssetType;
        assetSymbol: string;
        totalQuantity: number;
        totalMarketValue: number;
        totalHaircutValue: number;
        totalNetValue: number;
      }
    >();

    for (const v of filtered) {
      const key = `${v.assetType}:${v.assetSymbol}`;
      const existing = aggregationMap.get(key);
      if (existing) {
        existing.totalQuantity += v.quantity;
        existing.totalMarketValue += v.marketValue;
        existing.totalHaircutValue += v.haircutValue;
        existing.totalNetValue += v.netValue;
      } else {
        aggregationMap.set(key, {
          assetType: v.assetType,
          assetSymbol: v.assetSymbol,
          totalQuantity: v.quantity,
          totalMarketValue: v.marketValue,
          totalHaircutValue: v.haircutValue,
          totalNetValue: v.netValue,
        });
      }
    }

    const assets = Array.from(aggregationMap.values());
    const totalMarketValue = assets.reduce((sum, a) => sum + a.totalMarketValue, 0);
    const totalNetValue = assets.reduce((sum, a) => sum + a.totalNetValue, 0);

    return {
      id: generateId(),
      reportDate: now().split('T')[0]!,
      reportPeriodStart: periodStart.toISOString(),
      reportPeriodEnd: periodEnd.toISOString(),
      accountClass,
      assets,
      totalMarketValue,
      totalNetValue,
      generatedAt: now(),
    };
  }

  /**
   * Get the most recent segregation calculation for a given account class
   * and date.
   *
   * @param accountClass - The CFTC account class
   * @param date - The date to retrieve the calculation for
   * @returns The most recent SegregationCalculation for that day, or undefined
   */
  generateDailySegregationReport(
    accountClass: CFTCAccountClass,
    date: Date,
  ): SegregationCalculation | undefined {
    const dateStr = date.toISOString().split('T')[0]!;

    const matching = this.segregationCalculations.filter((c) => {
      const cDate = c.timestamp.split('T')[0];
      return c.accountClass === accountClass && cDate === dateStr;
    });

    if (matching.length === 0) return undefined;

    // Return the most recent one (last in the array for the given date)
    return matching[matching.length - 1];
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  /**
   * Query collateral valuations with optional filters.
   *
   * @param filters - Optional filter criteria
   * @returns Array of matching CollateralValuation records
   */
  getCollateralValuations(filters?: {
    accountClass?: CFTCAccountClass;
    assetType?: DigitalAssetType;
    startDate?: Date;
    endDate?: Date;
  }): CollateralValuation[] {
    if (!filters) return [...this.collateralValuations];

    return this.collateralValuations.filter((v) => {
      if (filters.accountClass && v.accountClass !== filters.accountClass) return false;
      if (filters.assetType && v.assetType !== filters.assetType) return false;
      if (filters.startDate) {
        const ts = new Date(v.timestamp);
        if (ts < filters.startDate) return false;
      }
      if (filters.endDate) {
        const ts = new Date(v.timestamp);
        if (ts > filters.endDate) return false;
      }
      return true;
    });
  }

  /**
   * Query incident reports with optional filters.
   *
   * @param filters - Optional filter criteria
   * @returns Array of matching IncidentReport records
   */
  getIncidents(filters?: {
    severity?: IncidentReport['severity'];
    status?: IncidentReport['resolutionStatus'];
    startDate?: Date;
    endDate?: Date;
  }): IncidentReport[] {
    if (!filters) return [...this.incidents];

    return this.incidents.filter((i) => {
      if (filters.severity && i.severity !== filters.severity) return false;
      if (filters.status && i.resolutionStatus !== filters.status) return false;
      if (filters.startDate) {
        const ts = new Date(i.timestamp);
        if (ts < filters.startDate) return false;
      }
      if (filters.endDate) {
        const ts = new Date(i.timestamp);
        if (ts > filters.endDate) return false;
      }
      return true;
    });
  }

  /**
   * Query segregation calculations with optional filters.
   *
   * @param filters - Optional filter criteria
   * @returns Array of matching SegregationCalculation records
   */
  getSegregationCalculations(filters?: {
    accountClass?: CFTCAccountClass;
    startDate?: Date;
    endDate?: Date;
  }): SegregationCalculation[] {
    if (!filters) return [...this.segregationCalculations];

    return this.segregationCalculations.filter((c) => {
      if (filters.accountClass && c.accountClass !== filters.accountClass) return false;
      if (filters.startDate) {
        const ts = new Date(c.timestamp);
        if (ts < filters.startDate) return false;
      }
      if (filters.endDate) {
        const ts = new Date(c.timestamp);
        if (ts > filters.endDate) return false;
      }
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // Haircut Validation
  // --------------------------------------------------------------------------

  /**
   * Validate a haircut percentage against CFTC Letter 26-05 requirements.
   *
   * Rules:
   * - Payment stablecoins: no minimum haircut required
   * - BTC / ETH: no minimum (deferred to DCO haircut schedule)
   * - Other digital assets: minimum 20% haircut required
   *
   * @param assetType - The digital asset type
   * @param haircutPercentage - The proposed haircut (0.0 - 1.0)
   * @returns HaircutValidationResult with validity, minimum, and message
   */
  validateHaircut(
    assetType: DigitalAssetType,
    haircutPercentage: number,
  ): HaircutValidationResult {
    switch (assetType) {
      case 'payment_stablecoin':
        return {
          valid: true,
          minimumRequired: 0,
          message: 'Payment stablecoins have no mandatory minimum haircut per CFTC Letter 26-05.',
        };

      case 'btc':
        return {
          valid: true,
          minimumRequired: 0,
          message: 'BTC haircut deferred to DCO schedule per CFTC Letter 26-05.',
        };

      case 'eth':
        return {
          valid: true,
          minimumRequired: 0,
          message: 'ETH haircut deferred to DCO schedule per CFTC Letter 26-05.',
        };

      case 'other_digital_asset': {
        const minimum = this.config.minimumNonBtcEthHaircut;
        const valid = haircutPercentage >= minimum;
        return {
          valid,
          minimumRequired: minimum,
          message: valid
            ? `Haircut of ${(haircutPercentage * 100).toFixed(1)}% meets the minimum ${(minimum * 100).toFixed(1)}% requirement for other digital assets.`
            : `Haircut of ${(haircutPercentage * 100).toFixed(1)}% is below the minimum ${(minimum * 100).toFixed(1)}% required for other digital assets per CFTC Letter 26-05.`,
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------

  /**
   * Export CFTC compliance data in JSON or CSV format.
   *
   * @param options - Export options including format, report type, and filters
   * @returns Formatted string (JSON or CSV)
   */
  exportCFTCReport(options: {
    format: 'json' | 'csv';
    reportType: 'weekly_digital_assets' | 'daily_segregation' | 'incidents';
    accountClass?: CFTCAccountClass;
    startDate?: Date;
    endDate?: Date;
  }): string {
    let data: Record<string, unknown>[];

    switch (options.reportType) {
      case 'weekly_digital_assets': {
        const valuations = this.getCollateralValuations({
          accountClass: options.accountClass,
          startDate: options.startDate,
          endDate: options.endDate,
        });
        data = valuations.map((v) => ({
          id: v.id,
          timestamp: v.timestamp,
          accountClass: v.accountClass,
          assetType: v.assetType,
          assetSymbol: v.assetSymbol,
          quantity: v.quantity,
          marketValue: v.marketValue,
          haircutPercentage: v.haircutPercentage,
          haircutValue: v.haircutValue,
          netValue: v.netValue,
          dcoReference: v.dcoReference ?? '',
          valuationMethod: v.valuationMethod,
          agentId: v.agentId,
        }));
        break;
      }

      case 'daily_segregation': {
        const calculations = this.getSegregationCalculations({
          accountClass: options.accountClass,
          startDate: options.startDate,
          endDate: options.endDate,
        });
        data = calculations.map((c) => ({
          id: c.id,
          timestamp: c.timestamp,
          accountClass: c.accountClass,
          totalCustomerFunds: c.totalCustomerFunds,
          requiredAmount: c.requiredAmount,
          excessDeficit: c.excessDeficit,
          digitalAssetBreakdown: JSON.stringify(c.digitalAssetBreakdown),
          residualInterest: c.residualInterest,
          agentId: c.agentId,
        }));
        break;
      }

      case 'incidents': {
        const incidents = this.getIncidents({
          startDate: options.startDate,
          endDate: options.endDate,
        });
        data = incidents.map((i) => ({
          id: i.id,
          timestamp: i.timestamp,
          severity: i.severity,
          incidentType: i.incidentType,
          description: i.description,
          affectedSystems: i.affectedSystems.join('; '),
          affectedCustomerCount: i.affectedCustomerCount ?? '',
          financialImpact: i.financialImpact ?? '',
          resolutionStatus: i.resolutionStatus,
          agentId: i.agentId,
        }));
        break;
      }
    }

    if (options.format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    return toCsv(data);
  }
}
