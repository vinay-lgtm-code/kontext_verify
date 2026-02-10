import { describe, it, expect, beforeEach } from 'vitest';
import { CFTCCompliance } from '../src/index.js';
import type {
  CFTCAccountClass,
  DigitalAssetType,
  CollateralValuation,
  SegregationCalculation,
  DigitalAssetReport,
  IncidentReport,
  CFTCComplianceConfig,
} from '../src/index.js';

// ============================================================================
// Test Helpers
// ============================================================================

function makeValuationInput(overrides?: Partial<CollateralValuation>) {
  return {
    accountClass: 'futures' as CFTCAccountClass,
    assetType: 'payment_stablecoin' as DigitalAssetType,
    assetSymbol: 'USDC',
    quantity: 1_000_000,
    marketValue: 1_000_000,
    haircutPercentage: 0.02,
    haircutValue: 20_000,
    netValue: 980_000,
    valuationMethod: 'mark_to_market',
    agentId: 'agent-1',
    ...overrides,
  };
}

function makeSegregationInput(overrides?: Partial<SegregationCalculation>) {
  return {
    accountClass: 'futures' as CFTCAccountClass,
    totalCustomerFunds: 50_000_000,
    requiredAmount: 45_000_000,
    excessDeficit: 5_000_000,
    digitalAssetBreakdown: [
      {
        assetType: 'payment_stablecoin' as DigitalAssetType,
        assetSymbol: 'USDC',
        quantity: 10_000_000,
        marketValue: 10_000_000,
        haircutValue: 200_000,
        netValue: 9_800_000,
      },
    ],
    residualInterest: 1_000_000,
    agentId: 'seg-agent-1',
    ...overrides,
  };
}

function makeIncidentInput(overrides?: Partial<IncidentReport>) {
  return {
    severity: 'high' as const,
    incidentType: 'cybersecurity' as const,
    description: 'Unauthorized access attempt detected on margin system',
    affectedSystems: ['margin-engine', 'collateral-vault'],
    resolutionStatus: 'investigating' as const,
    agentId: 'sec-agent-1',
    ...overrides,
  };
}

// ============================================================================
// 1. Collateral Valuation Logging
// ============================================================================

describe('CFTCCompliance - Collateral Valuation', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();
  });

  it('should log a payment stablecoin collateral valuation', () => {
    const valuation = cftc.logCollateralValuation(makeValuationInput());

    expect(valuation.id).toBeDefined();
    expect(valuation.timestamp).toBeDefined();
    expect(valuation.accountClass).toBe('futures');
    expect(valuation.assetType).toBe('payment_stablecoin');
    expect(valuation.assetSymbol).toBe('USDC');
    expect(valuation.quantity).toBe(1_000_000);
    expect(valuation.marketValue).toBe(1_000_000);
    expect(valuation.haircutPercentage).toBe(0.02);
    expect(valuation.haircutValue).toBe(20_000);
    expect(valuation.netValue).toBe(980_000);
    expect(valuation.valuationMethod).toBe('mark_to_market');
    expect(valuation.agentId).toBe('agent-1');
  });

  it('should log a BTC collateral valuation', () => {
    const valuation = cftc.logCollateralValuation(
      makeValuationInput({
        assetType: 'btc',
        assetSymbol: 'BTC',
        quantity: 10,
        marketValue: 500_000,
        haircutPercentage: 0.15,
        haircutValue: 75_000,
        netValue: 425_000,
        dcoReference: 'CME-BTC-HAIRCUT-2026Q1',
      }),
    );

    expect(valuation.assetType).toBe('btc');
    expect(valuation.assetSymbol).toBe('BTC');
    expect(valuation.dcoReference).toBe('CME-BTC-HAIRCUT-2026Q1');
  });

  it('should log an ETH collateral valuation', () => {
    const valuation = cftc.logCollateralValuation(
      makeValuationInput({
        assetType: 'eth',
        assetSymbol: 'ETH',
        quantity: 200,
        marketValue: 600_000,
        haircutPercentage: 0.10,
        haircutValue: 60_000,
        netValue: 540_000,
      }),
    );

    expect(valuation.assetType).toBe('eth');
    expect(valuation.assetSymbol).toBe('ETH');
  });

  it('should log an other_digital_asset collateral valuation with valid haircut', () => {
    const valuation = cftc.logCollateralValuation(
      makeValuationInput({
        assetType: 'other_digital_asset',
        assetSymbol: 'SOL',
        quantity: 5000,
        marketValue: 250_000,
        haircutPercentage: 0.25,
        haircutValue: 62_500,
        netValue: 187_500,
      }),
    );

    expect(valuation.assetType).toBe('other_digital_asset');
    expect(valuation.haircutPercentage).toBe(0.25);
  });

  it('should log valuations for all account classes', () => {
    const classes: CFTCAccountClass[] = ['futures', 'cleared_swaps', '30.7'];

    for (const accountClass of classes) {
      const valuation = cftc.logCollateralValuation(
        makeValuationInput({ accountClass }),
      );
      expect(valuation.accountClass).toBe(accountClass);
    }

    expect(cftc.getCollateralValuations()).toHaveLength(3);
  });

  it('should auto-generate id and timestamp if not provided', () => {
    const valuation = cftc.logCollateralValuation(makeValuationInput());

    expect(valuation.id).toBeTruthy();
    expect(valuation.timestamp).toBeTruthy();
    expect(new Date(valuation.timestamp).getTime()).not.toBeNaN();
  });

  it('should use provided id and timestamp when given', () => {
    const valuation = cftc.logCollateralValuation(
      makeValuationInput({
        id: 'custom-id-123',
        timestamp: '2026-02-06T12:00:00.000Z',
      } as any),
    );

    expect(valuation.id).toBe('custom-id-123');
    expect(valuation.timestamp).toBe('2026-02-06T12:00:00.000Z');
  });

  it('should store metadata when provided', () => {
    const valuation = cftc.logCollateralValuation(
      makeValuationInput({
        metadata: { custodian: 'Anchorage', walletAddress: '0xabc123' },
      }),
    );

    expect(valuation.metadata).toEqual({
      custodian: 'Anchorage',
      walletAddress: '0xabc123',
    });
  });
});

// ============================================================================
// 2. Haircut Validation
// ============================================================================

describe('CFTCCompliance - Haircut Validation', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();
  });

  it('should accept any haircut for payment stablecoins (no minimum)', () => {
    const result = cftc.validateHaircut('payment_stablecoin', 0.0);
    expect(result.valid).toBe(true);
    expect(result.minimumRequired).toBe(0);
    expect(result.message).toContain('no mandatory minimum');
  });

  it('should accept zero haircut for payment stablecoins', () => {
    const result = cftc.validateHaircut('payment_stablecoin', 0);
    expect(result.valid).toBe(true);
  });

  it('should accept any haircut for BTC (deferred to DCO)', () => {
    const result = cftc.validateHaircut('btc', 0.05);
    expect(result.valid).toBe(true);
    expect(result.minimumRequired).toBe(0);
    expect(result.message).toContain('DCO schedule');
  });

  it('should accept zero haircut for BTC', () => {
    const result = cftc.validateHaircut('btc', 0);
    expect(result.valid).toBe(true);
  });

  it('should accept any haircut for ETH (deferred to DCO)', () => {
    const result = cftc.validateHaircut('eth', 0.08);
    expect(result.valid).toBe(true);
    expect(result.minimumRequired).toBe(0);
    expect(result.message).toContain('DCO schedule');
  });

  it('should accept zero haircut for ETH', () => {
    const result = cftc.validateHaircut('eth', 0);
    expect(result.valid).toBe(true);
  });

  it('should reject insufficient haircut for other digital assets (below 20%)', () => {
    const result = cftc.validateHaircut('other_digital_asset', 0.15);
    expect(result.valid).toBe(false);
    expect(result.minimumRequired).toBe(0.20);
    expect(result.message).toContain('below the minimum');
  });

  it('should accept haircut at exactly 20% for other digital assets', () => {
    const result = cftc.validateHaircut('other_digital_asset', 0.20);
    expect(result.valid).toBe(true);
    expect(result.minimumRequired).toBe(0.20);
    expect(result.message).toContain('meets the minimum');
  });

  it('should accept haircut above 20% for other digital assets', () => {
    const result = cftc.validateHaircut('other_digital_asset', 0.35);
    expect(result.valid).toBe(true);
  });

  it('should throw when logging other_digital_asset with insufficient haircut', () => {
    expect(() =>
      cftc.logCollateralValuation(
        makeValuationInput({
          assetType: 'other_digital_asset',
          assetSymbol: 'DOGE',
          haircutPercentage: 0.10,
        }),
      ),
    ).toThrow('Haircut validation failed');
  });

  it('should NOT throw for other_digital_asset with insufficient haircut when validation disabled', () => {
    const cftcNoValidation = new CFTCCompliance({ enableHaircutValidation: false });

    const valuation = cftcNoValidation.logCollateralValuation(
      makeValuationInput({
        assetType: 'other_digital_asset',
        assetSymbol: 'DOGE',
        haircutPercentage: 0.05,
      }),
    );

    expect(valuation.haircutPercentage).toBe(0.05);
  });

  it('should use custom minimum haircut when configured', () => {
    const cftcCustom = new CFTCCompliance({ minimumNonBtcEthHaircut: 0.30 });
    const result = cftcCustom.validateHaircut('other_digital_asset', 0.25);

    expect(result.valid).toBe(false);
    expect(result.minimumRequired).toBe(0.30);
  });
});

// ============================================================================
// 3. Segregation Calculation Logging
// ============================================================================

describe('CFTCCompliance - Segregation Calculations', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();
  });

  it('should log a segregation calculation', () => {
    const calc = cftc.logSegregationCalculation(makeSegregationInput());

    expect(calc.id).toBeDefined();
    expect(calc.timestamp).toBeDefined();
    expect(calc.accountClass).toBe('futures');
    expect(calc.totalCustomerFunds).toBe(50_000_000);
    expect(calc.requiredAmount).toBe(45_000_000);
    expect(calc.excessDeficit).toBe(5_000_000);
    expect(calc.digitalAssetBreakdown).toHaveLength(1);
    expect(calc.residualInterest).toBe(1_000_000);
    expect(calc.agentId).toBe('seg-agent-1');
  });

  it('should log segregation calculation for cleared_swaps', () => {
    const calc = cftc.logSegregationCalculation(
      makeSegregationInput({ accountClass: 'cleared_swaps' }),
    );
    expect(calc.accountClass).toBe('cleared_swaps');
  });

  it('should log segregation calculation for 30.7', () => {
    const calc = cftc.logSegregationCalculation(
      makeSegregationInput({ accountClass: '30.7' }),
    );
    expect(calc.accountClass).toBe('30.7');
  });

  it('should log a negative excess/deficit (deficit)', () => {
    const calc = cftc.logSegregationCalculation(
      makeSegregationInput({
        totalCustomerFunds: 40_000_000,
        requiredAmount: 45_000_000,
        excessDeficit: -5_000_000,
      }),
    );

    expect(calc.excessDeficit).toBe(-5_000_000);
  });

  it('should store metadata on segregation calculation', () => {
    const calc = cftc.logSegregationCalculation(
      makeSegregationInput({
        metadata: { reviewer: 'compliance-team' },
      }),
    );

    expect(calc.metadata).toEqual({ reviewer: 'compliance-team' });
  });

  it('should auto-generate id and timestamp', () => {
    const calc = cftc.logSegregationCalculation(makeSegregationInput());
    expect(calc.id).toBeTruthy();
    expect(new Date(calc.timestamp).getTime()).not.toBeNaN();
  });
});

// ============================================================================
// 4. Incident Reporting
// ============================================================================

describe('CFTCCompliance - Incident Reporting', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();
  });

  it('should log a cybersecurity incident', () => {
    const incident = cftc.logIncident(makeIncidentInput());

    expect(incident.id).toBeDefined();
    expect(incident.timestamp).toBeDefined();
    expect(incident.severity).toBe('high');
    expect(incident.incidentType).toBe('cybersecurity');
    expect(incident.description).toContain('Unauthorized access');
    expect(incident.affectedSystems).toEqual(['margin-engine', 'collateral-vault']);
    expect(incident.resolutionStatus).toBe('investigating');
    expect(incident.agentId).toBe('sec-agent-1');
  });

  it('should log an operational incident', () => {
    const incident = cftc.logIncident(
      makeIncidentInput({
        incidentType: 'operational',
        severity: 'medium',
        description: 'Delayed margin call processing',
      }),
    );

    expect(incident.incidentType).toBe('operational');
    expect(incident.severity).toBe('medium');
  });

  it('should log a system_failure incident', () => {
    const incident = cftc.logIncident(
      makeIncidentInput({
        incidentType: 'system_failure',
        severity: 'critical',
        description: 'Collateral valuation service down',
      }),
    );

    expect(incident.incidentType).toBe('system_failure');
    expect(incident.severity).toBe('critical');
  });

  it('should log a disruption incident', () => {
    const incident = cftc.logIncident(
      makeIncidentInput({
        incidentType: 'disruption',
        severity: 'low',
        description: 'Brief delay in report generation',
      }),
    );

    expect(incident.incidentType).toBe('disruption');
    expect(incident.severity).toBe('low');
  });

  it('should include optional customer count and financial impact', () => {
    const incident = cftc.logIncident(
      makeIncidentInput({
        affectedCustomerCount: 150,
        financialImpact: 500_000,
      }),
    );

    expect(incident.affectedCustomerCount).toBe(150);
    expect(incident.financialImpact).toBe(500_000);
  });

  it('should store metadata on incidents', () => {
    const incident = cftc.logIncident(
      makeIncidentInput({
        metadata: { ticketId: 'INC-2026-001' },
      }),
    );

    expect(incident.metadata).toEqual({ ticketId: 'INC-2026-001' });
  });

  it('should log incidents with all severity levels', () => {
    const severities = ['critical', 'high', 'medium', 'low'] as const;

    for (const severity of severities) {
      cftc.logIncident(makeIncidentInput({ severity }));
    }

    expect(cftc.getIncidents()).toHaveLength(4);
  });

  it('should log incidents with all resolution statuses', () => {
    const statuses = ['open', 'investigating', 'resolved'] as const;

    for (const resolutionStatus of statuses) {
      cftc.logIncident(makeIncidentInput({ resolutionStatus }));
    }

    expect(cftc.getIncidents()).toHaveLength(3);
  });
});

// ============================================================================
// 5. Weekly Digital Asset Report Generation
// ============================================================================

describe('CFTCCompliance - Weekly Digital Asset Report', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();
  });

  it('should generate a weekly report aggregating valuations', () => {
    // Log multiple valuations in the period
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-03T10:00:00.000Z',
        quantity: 500_000,
        marketValue: 500_000,
        haircutValue: 10_000,
        netValue: 490_000,
      } as any),
    );
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-05T14:00:00.000Z',
        quantity: 300_000,
        marketValue: 300_000,
        haircutValue: 6_000,
        netValue: 294_000,
      } as any),
    );

    const report = cftc.generateWeeklyDigitalAssetReport(
      'futures',
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-07T23:59:59.999Z'),
    );

    expect(report.id).toBeDefined();
    expect(report.reportDate).toBeDefined();
    expect(report.accountClass).toBe('futures');
    expect(report.reportPeriodStart).toBe('2026-02-01T00:00:00.000Z');
    expect(report.reportPeriodEnd).toBe('2026-02-07T23:59:59.999Z');
    expect(report.assets).toHaveLength(1);

    const usdcAsset = report.assets[0]!;
    expect(usdcAsset.assetType).toBe('payment_stablecoin');
    expect(usdcAsset.assetSymbol).toBe('USDC');
    expect(usdcAsset.totalQuantity).toBe(800_000);
    expect(usdcAsset.totalMarketValue).toBe(800_000);
    expect(usdcAsset.totalHaircutValue).toBe(16_000);
    expect(usdcAsset.totalNetValue).toBe(784_000);

    expect(report.totalMarketValue).toBe(800_000);
    expect(report.totalNetValue).toBe(784_000);
    expect(report.generatedAt).toBeDefined();
  });

  it('should aggregate multiple asset types separately', () => {
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-03T10:00:00.000Z',
        assetType: 'payment_stablecoin',
        assetSymbol: 'USDC',
        quantity: 1_000_000,
        marketValue: 1_000_000,
        haircutValue: 20_000,
        netValue: 980_000,
      } as any),
    );
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-04T10:00:00.000Z',
        assetType: 'btc',
        assetSymbol: 'BTC',
        quantity: 5,
        marketValue: 250_000,
        haircutPercentage: 0.10,
        haircutValue: 25_000,
        netValue: 225_000,
      } as any),
    );

    const report = cftc.generateWeeklyDigitalAssetReport(
      'futures',
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-07T23:59:59.999Z'),
    );

    expect(report.assets).toHaveLength(2);
    expect(report.totalMarketValue).toBe(1_250_000);
    expect(report.totalNetValue).toBe(1_205_000);
  });

  it('should only include valuations for the specified account class', () => {
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-03T10:00:00.000Z',
        accountClass: 'futures',
      } as any),
    );
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-03T10:00:00.000Z',
        accountClass: 'cleared_swaps',
      } as any),
    );

    const futuresReport = cftc.generateWeeklyDigitalAssetReport(
      'futures',
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-07T23:59:59.999Z'),
    );

    // Only 1 asset group from futures
    expect(futuresReport.assets).toHaveLength(1);
    expect(futuresReport.totalMarketValue).toBe(1_000_000);
  });

  it('should return empty assets for a period with no data', () => {
    const report = cftc.generateWeeklyDigitalAssetReport(
      'futures',
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-07T23:59:59.999Z'),
    );

    expect(report.assets).toHaveLength(0);
    expect(report.totalMarketValue).toBe(0);
    expect(report.totalNetValue).toBe(0);
  });

  it('should exclude valuations outside the date range', () => {
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-01-31T23:59:59.000Z',
      } as any),
    );
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-08T00:00:01.000Z',
      } as any),
    );
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-04T12:00:00.000Z',
        quantity: 500_000,
        marketValue: 500_000,
        haircutValue: 10_000,
        netValue: 490_000,
      } as any),
    );

    const report = cftc.generateWeeklyDigitalAssetReport(
      'futures',
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-07T23:59:59.999Z'),
    );

    expect(report.assets).toHaveLength(1);
    expect(report.totalMarketValue).toBe(500_000);
  });
});

// ============================================================================
// 6. Daily Segregation Report
// ============================================================================

describe('CFTCCompliance - Daily Segregation Report', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();
  });

  it('should return the most recent segregation calculation for a date', () => {
    cftc.logSegregationCalculation(
      makeSegregationInput({
        timestamp: '2026-02-05T08:00:00.000Z',
        totalCustomerFunds: 40_000_000,
        excessDeficit: 3_000_000,
      } as any),
    );
    cftc.logSegregationCalculation(
      makeSegregationInput({
        timestamp: '2026-02-05T16:00:00.000Z',
        totalCustomerFunds: 42_000_000,
        excessDeficit: 5_000_000,
      } as any),
    );

    const report = cftc.generateDailySegregationReport(
      'futures',
      new Date('2026-02-05'),
    );

    expect(report).toBeDefined();
    expect(report!.totalCustomerFunds).toBe(42_000_000);
    expect(report!.excessDeficit).toBe(5_000_000);
  });

  it('should return undefined when no calculation exists for the date', () => {
    const report = cftc.generateDailySegregationReport(
      'futures',
      new Date('2026-02-10'),
    );

    expect(report).toBeUndefined();
  });

  it('should only return calculations for the specified account class', () => {
    cftc.logSegregationCalculation(
      makeSegregationInput({
        timestamp: '2026-02-05T10:00:00.000Z',
        accountClass: 'futures',
        totalCustomerFunds: 50_000_000,
      } as any),
    );
    cftc.logSegregationCalculation(
      makeSegregationInput({
        timestamp: '2026-02-05T10:00:00.000Z',
        accountClass: 'cleared_swaps',
        totalCustomerFunds: 30_000_000,
      } as any),
    );

    const futuresReport = cftc.generateDailySegregationReport(
      'futures',
      new Date('2026-02-05'),
    );
    const swapsReport = cftc.generateDailySegregationReport(
      'cleared_swaps',
      new Date('2026-02-05'),
    );

    expect(futuresReport!.totalCustomerFunds).toBe(50_000_000);
    expect(swapsReport!.totalCustomerFunds).toBe(30_000_000);
  });
});

// ============================================================================
// 7. Filtering / Querying
// ============================================================================

describe('CFTCCompliance - Query & Filtering', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();

    // Seed data
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-01T10:00:00.000Z',
        accountClass: 'futures',
        assetType: 'payment_stablecoin',
      } as any),
    );
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-03T10:00:00.000Z',
        accountClass: 'cleared_swaps',
        assetType: 'btc',
        assetSymbol: 'BTC',
        haircutPercentage: 0.10,
      } as any),
    );
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-05T10:00:00.000Z',
        accountClass: 'futures',
        assetType: 'eth',
        assetSymbol: 'ETH',
        haircutPercentage: 0.08,
      } as any),
    );
  });

  it('should return all valuations when no filter is specified', () => {
    expect(cftc.getCollateralValuations()).toHaveLength(3);
  });

  it('should filter valuations by account class', () => {
    const futures = cftc.getCollateralValuations({ accountClass: 'futures' });
    expect(futures).toHaveLength(2);
    expect(futures.every((v) => v.accountClass === 'futures')).toBe(true);
  });

  it('should filter valuations by asset type', () => {
    const btc = cftc.getCollateralValuations({ assetType: 'btc' });
    expect(btc).toHaveLength(1);
    expect(btc[0]!.assetSymbol).toBe('BTC');
  });

  it('should filter valuations by date range', () => {
    const filtered = cftc.getCollateralValuations({
      startDate: new Date('2026-02-02T00:00:00.000Z'),
      endDate: new Date('2026-02-04T23:59:59.999Z'),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.assetType).toBe('btc');
  });

  it('should combine multiple filters', () => {
    const filtered = cftc.getCollateralValuations({
      accountClass: 'futures',
      startDate: new Date('2026-02-04T00:00:00.000Z'),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.assetType).toBe('eth');
  });

  it('should return empty array for no matching filters', () => {
    const filtered = cftc.getCollateralValuations({ accountClass: '30.7' });
    expect(filtered).toHaveLength(0);
  });

  it('should filter incidents by severity', () => {
    cftc.logIncident(makeIncidentInput({ severity: 'critical' }));
    cftc.logIncident(makeIncidentInput({ severity: 'low' }));
    cftc.logIncident(makeIncidentInput({ severity: 'critical' }));

    const critical = cftc.getIncidents({ severity: 'critical' });
    expect(critical).toHaveLength(2);
  });

  it('should filter incidents by resolution status', () => {
    cftc.logIncident(makeIncidentInput({ resolutionStatus: 'open' }));
    cftc.logIncident(makeIncidentInput({ resolutionStatus: 'resolved' }));
    cftc.logIncident(makeIncidentInput({ resolutionStatus: 'open' }));

    const open = cftc.getIncidents({ status: 'open' });
    expect(open).toHaveLength(2);
  });

  it('should filter incidents by date range', () => {
    cftc.logIncident(
      makeIncidentInput({ timestamp: '2026-02-01T10:00:00.000Z' } as any),
    );
    cftc.logIncident(
      makeIncidentInput({ timestamp: '2026-02-05T10:00:00.000Z' } as any),
    );

    const filtered = cftc.getIncidents({
      startDate: new Date('2026-02-04T00:00:00.000Z'),
      endDate: new Date('2026-02-06T00:00:00.000Z'),
    });
    expect(filtered).toHaveLength(1);
  });

  it('should filter segregation calculations by account class', () => {
    cftc.logSegregationCalculation(makeSegregationInput({ accountClass: 'futures' }));
    cftc.logSegregationCalculation(makeSegregationInput({ accountClass: 'cleared_swaps' }));
    cftc.logSegregationCalculation(makeSegregationInput({ accountClass: '30.7' }));

    const futures = cftc.getSegregationCalculations({ accountClass: 'futures' });
    expect(futures).toHaveLength(1);
    expect(futures[0]!.accountClass).toBe('futures');
  });

  it('should filter segregation calculations by date range', () => {
    cftc.logSegregationCalculation(
      makeSegregationInput({ timestamp: '2026-02-01T10:00:00.000Z' } as any),
    );
    cftc.logSegregationCalculation(
      makeSegregationInput({ timestamp: '2026-02-10T10:00:00.000Z' } as any),
    );

    const filtered = cftc.getSegregationCalculations({
      startDate: new Date('2026-02-05T00:00:00.000Z'),
    });
    expect(filtered).toHaveLength(1);
  });

  it('should return all incidents when no filter is specified', () => {
    cftc.logIncident(makeIncidentInput());
    cftc.logIncident(makeIncidentInput());
    expect(cftc.getIncidents()).toHaveLength(2);
  });

  it('should return all segregation calculations when no filter is specified', () => {
    cftc.logSegregationCalculation(makeSegregationInput());
    expect(cftc.getSegregationCalculations()).toHaveLength(1);
  });
});

// ============================================================================
// 8. Export (JSON and CSV)
// ============================================================================

describe('CFTCCompliance - Export', () => {
  let cftc: CFTCCompliance;

  beforeEach(() => {
    cftc = new CFTCCompliance();

    // Seed data
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-03T10:00:00.000Z',
      } as any),
    );
    cftc.logSegregationCalculation(
      makeSegregationInput({
        timestamp: '2026-02-03T10:00:00.000Z',
      } as any),
    );
    cftc.logIncident(
      makeIncidentInput({
        timestamp: '2026-02-03T10:00:00.000Z',
      } as any),
    );
  });

  it('should export weekly digital assets as JSON', () => {
    const json = cftc.exportCFTCReport({
      format: 'json',
      reportType: 'weekly_digital_assets',
    });

    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].assetSymbol).toBe('USDC');
    expect(parsed[0].marketValue).toBe(1_000_000);
  });

  it('should export weekly digital assets as CSV', () => {
    const csv = cftc.exportCFTCReport({
      format: 'csv',
      reportType: 'weekly_digital_assets',
    });

    expect(csv).toContain('id,timestamp,accountClass,assetType,assetSymbol');
    expect(csv).toContain('USDC');
    expect(csv).toContain('payment_stablecoin');
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // header + 1 row
  });

  it('should export daily segregation as JSON', () => {
    const json = cftc.exportCFTCReport({
      format: 'json',
      reportType: 'daily_segregation',
    });

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].totalCustomerFunds).toBe(50_000_000);
  });

  it('should export daily segregation as CSV', () => {
    const csv = cftc.exportCFTCReport({
      format: 'csv',
      reportType: 'daily_segregation',
    });

    expect(csv).toContain('totalCustomerFunds');
    expect(csv).toContain('50000000');
  });

  it('should export incidents as JSON', () => {
    const json = cftc.exportCFTCReport({
      format: 'json',
      reportType: 'incidents',
    });

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].severity).toBe('high');
    expect(parsed[0].incidentType).toBe('cybersecurity');
  });

  it('should export incidents as CSV', () => {
    const csv = cftc.exportCFTCReport({
      format: 'csv',
      reportType: 'incidents',
    });

    expect(csv).toContain('severity');
    expect(csv).toContain('cybersecurity');
  });

  it('should export filtered data by account class', () => {
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-02-03T12:00:00.000Z',
        accountClass: 'cleared_swaps',
      } as any),
    );

    const json = cftc.exportCFTCReport({
      format: 'json',
      reportType: 'weekly_digital_assets',
      accountClass: 'futures',
    });

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].accountClass).toBe('futures');
  });

  it('should export filtered data by date range', () => {
    cftc.logCollateralValuation(
      makeValuationInput({
        timestamp: '2026-03-01T10:00:00.000Z',
      } as any),
    );

    const json = cftc.exportCFTCReport({
      format: 'json',
      reportType: 'weekly_digital_assets',
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2026-02-28T23:59:59.999Z'),
    });

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
  });

  it('should return empty JSON array when no data matches', () => {
    const json = cftc.exportCFTCReport({
      format: 'json',
      reportType: 'weekly_digital_assets',
      accountClass: '30.7',
    });

    expect(JSON.parse(json)).toEqual([]);
  });

  it('should return empty string for CSV export with no data', () => {
    const csv = cftc.exportCFTCReport({
      format: 'csv',
      reportType: 'weekly_digital_assets',
      accountClass: '30.7',
    });

    expect(csv).toBe('');
  });
});

// ============================================================================
// 9. Edge Cases
// ============================================================================

describe('CFTCCompliance - Edge Cases', () => {
  it('should handle fresh instance with no data', () => {
    const cftc = new CFTCCompliance();

    expect(cftc.getCollateralValuations()).toEqual([]);
    expect(cftc.getSegregationCalculations()).toEqual([]);
    expect(cftc.getIncidents()).toEqual([]);
  });

  it('should handle weekly report with empty data', () => {
    const cftc = new CFTCCompliance();

    const report = cftc.generateWeeklyDigitalAssetReport(
      'futures',
      new Date('2026-02-01'),
      new Date('2026-02-07'),
    );

    expect(report.assets).toEqual([]);
    expect(report.totalMarketValue).toBe(0);
    expect(report.totalNetValue).toBe(0);
  });

  it('should handle daily segregation report with no matching date', () => {
    const cftc = new CFTCCompliance();

    const report = cftc.generateDailySegregationReport(
      'futures',
      new Date('2026-02-05'),
    );

    expect(report).toBeUndefined();
  });

  it('should handle default config values', () => {
    const cftc = new CFTCCompliance();

    // Default 20% minimum for other digital assets
    const result = cftc.validateHaircut('other_digital_asset', 0.19);
    expect(result.valid).toBe(false);
    expect(result.minimumRequired).toBe(0.20);
  });

  it('should isolate data between instances', () => {
    const cftc1 = new CFTCCompliance();
    const cftc2 = new CFTCCompliance();

    cftc1.logCollateralValuation(makeValuationInput());
    cftc1.logIncident(makeIncidentInput());

    expect(cftc1.getCollateralValuations()).toHaveLength(1);
    expect(cftc2.getCollateralValuations()).toHaveLength(0);
    expect(cftc1.getIncidents()).toHaveLength(1);
    expect(cftc2.getIncidents()).toHaveLength(0);
  });

  it('should handle multiple valuations for the same asset aggregated correctly', () => {
    const cftc = new CFTCCompliance();

    // Same asset, 3 entries
    for (let i = 0; i < 3; i++) {
      cftc.logCollateralValuation(
        makeValuationInput({
          timestamp: `2026-02-0${i + 1}T10:00:00.000Z`,
          quantity: 100_000,
          marketValue: 100_000,
          haircutValue: 2_000,
          netValue: 98_000,
        } as any),
      );
    }

    const report = cftc.generateWeeklyDigitalAssetReport(
      'futures',
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-07T23:59:59.999Z'),
    );

    expect(report.assets).toHaveLength(1);
    expect(report.assets[0]!.totalQuantity).toBe(300_000);
    expect(report.assets[0]!.totalMarketValue).toBe(300_000);
    expect(report.assets[0]!.totalHaircutValue).toBe(6_000);
    expect(report.assets[0]!.totalNetValue).toBe(294_000);
  });

  it('should generate unique IDs for each record', () => {
    const cftc = new CFTCCompliance();

    const v1 = cftc.logCollateralValuation(makeValuationInput());
    const v2 = cftc.logCollateralValuation(makeValuationInput());
    const s1 = cftc.logSegregationCalculation(makeSegregationInput());
    const i1 = cftc.logIncident(makeIncidentInput());

    const ids = [v1.id, v2.id, s1.id, i1.id];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(4);
  });
});

// ============================================================================
// 10. Configuration
// ============================================================================

describe('CFTCCompliance - Configuration', () => {
  it('should use default config when no options provided', () => {
    const cftc = new CFTCCompliance();
    const result = cftc.validateHaircut('other_digital_asset', 0.20);
    expect(result.valid).toBe(true);
  });

  it('should allow custom minimum haircut threshold', () => {
    const cftc = new CFTCCompliance({ minimumNonBtcEthHaircut: 0.30 });

    const below = cftc.validateHaircut('other_digital_asset', 0.25);
    expect(below.valid).toBe(false);

    const above = cftc.validateHaircut('other_digital_asset', 0.30);
    expect(above.valid).toBe(true);
  });

  it('should allow disabling haircut validation', () => {
    const cftc = new CFTCCompliance({ enableHaircutValidation: false });

    // Should not throw even with 0% haircut on other_digital_asset
    const valuation = cftc.logCollateralValuation(
      makeValuationInput({
        assetType: 'other_digital_asset',
        assetSymbol: 'LINK',
        haircutPercentage: 0,
        haircutValue: 0,
      }),
    );
    expect(valuation.haircutPercentage).toBe(0);
  });

  it('should support reporting start date config', () => {
    const cftc = new CFTCCompliance({
      reportingStartDate: new Date('2026-02-06'),
    });

    // Module should be creatable with this config without error
    expect(cftc).toBeInstanceOf(CFTCCompliance);
  });
});
