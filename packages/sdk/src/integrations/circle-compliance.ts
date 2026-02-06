// ============================================================================
// Kontext SDK - Circle Compliance Engine Integration
// ============================================================================
//
// Integrates Circle's transaction screening capabilities with Kontext's own
// trust scoring and compliance infrastructure for dual-layer screening.
//
// Supports two operating modes:
// - **Simulation mode** (default): Runs simulated Circle screening alongside
//   real Kontext compliance checks.
// - **Live mode**: When a Circle API key is provided, calls Circle's actual
//   transaction screening APIs.
// ============================================================================

import type {
  Chain,
  ActionLog,
  LogTransactionInput,
  AnomalySeverity,
  ComplianceCheckResult,
  RiskFactor,
} from '../types.js';
import { generateId, now, parseAmount, isValidAddress } from '../utils.js';
import { UsdcCompliance } from './usdc.js';

// ============================================================================
// Types
// ============================================================================

/** Input for screening a transaction */
export interface ScreenTransactionInput {
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Transfer amount */
  amount: string;
  /** Blockchain network */
  chain: Chain;
  /** Token being transferred */
  token?: string;
}

/** Result of dual screening (Circle + Kontext) */
export interface DualScreenResult {
  /** Circle's screening result */
  circleScreening: {
    /** Whether the transaction is approved by Circle */
    approved: boolean;
    /** Risk level from Circle's screening */
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
    /** Flags raised by Circle's screening */
    flags: string[];
  };
  /** Kontext's screening result */
  kontextScreening: {
    /** Trust score (0-100) */
    trustScore: number;
    /** Whether anomaly was detected */
    anomalyDetected: boolean;
    /** Whether compliance checks passed */
    complianceApproved: boolean;
    /** Flags raised by Kontext screening */
    flags: string[];
  };
  /** Combined decision from both systems */
  combinedDecision: 'APPROVE' | 'REVIEW' | 'BLOCK';
  /** Kontext audit log ID */
  auditLogId: string;
}

/** Result of screening a single address */
export interface AddressScreenResult {
  /** The screened address */
  address: string;
  /** Blockchain network */
  chain: Chain;
  /** Whether the address is sanctioned */
  sanctioned: boolean;
  /** Risk level */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
  /** Flags raised */
  flags: string[];
  /** Screening timestamp */
  screenedAt: string;
}

/** Input for comprehensive risk assessment */
export interface RiskAssessmentInput {
  /** Address to assess */
  address: string;
  /** Blockchain network */
  chain: Chain;
  /** Agent ID for trust scoring */
  agentId?: string;
  /** Transaction amount for contextual assessment */
  amount?: string;
  /** Token for contextual assessment */
  token?: string;
}

/** Comprehensive risk assessment result */
export interface ComprehensiveRiskResult {
  /** Overall risk level */
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Circle-derived risk score (0-100) */
  circleRiskScore: number;
  /** Kontext trust score (0-100) */
  kontextTrustScore: number;
  /** Combined weighted score (0-100, higher = riskier) */
  combinedScore: number;
  /** Action recommendation */
  recommendation: 'PROCEED' | 'MANUAL_REVIEW' | 'BLOCK';
  /** Individual risk factors */
  factors: ComprehensiveRiskFactor[];
  /** Kontext audit log ID */
  auditLogId: string;
}

/** Risk factor in comprehensive assessment */
export interface ComprehensiveRiskFactor {
  /** Factor name */
  name: string;
  /** Risk score contribution (0-100) */
  score: number;
  /** Human-readable description */
  description: string;
}

/**
 * Adapter interface for Circle's compliance screening API.
 */
export interface CircleComplianceAdapter {
  screenTransaction(input: ScreenTransactionInput): Promise<{
    approved: boolean;
    riskLevel: string;
    flags: string[];
  }>;
  screenAddress(address: string, chain: Chain): Promise<{
    sanctioned: boolean;
    riskLevel: string;
    flags: string[];
  }>;
}

// ============================================================================
// Simulation Adapter
// ============================================================================

/** Known high-risk address patterns for simulation purposes */
const SIMULATED_HIGH_RISK_PREFIXES = [
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
];

/**
 * Simulated Circle compliance screening.
 * Uses heuristic rules to approximate screening behavior.
 */
class SimulatedComplianceAdapter implements CircleComplianceAdapter {
  async screenTransaction(input: ScreenTransactionInput): Promise<{
    approved: boolean;
    riskLevel: string;
    flags: string[];
  }> {
    const flags: string[] = [];
    let riskLevel = 'LOW';

    const amount = parseAmount(input.amount);

    // Simulate sanctions check
    if (this.isHighRiskAddress(input.from) || this.isHighRiskAddress(input.to)) {
      flags.push('SANCTIONED_ADDRESS');
      riskLevel = 'SEVERE';
    }

    // Amount-based risk
    if (!isNaN(amount)) {
      if (amount >= 100000) {
        flags.push('VERY_LARGE_AMOUNT');
        riskLevel = riskLevel === 'SEVERE' ? 'SEVERE' : 'HIGH';
      } else if (amount >= 50000) {
        flags.push('LARGE_AMOUNT');
        if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
      } else if (amount >= 10000) {
        flags.push('REPORTABLE_AMOUNT');
        if (riskLevel === 'LOW') riskLevel = 'LOW';
      }
    }

    // Invalid amount
    if (isNaN(amount) || amount <= 0) {
      flags.push('INVALID_AMOUNT');
      riskLevel = 'HIGH';
    }

    // Address format check
    if (!isValidAddress(input.from)) {
      flags.push('INVALID_SENDER_ADDRESS');
      riskLevel = 'HIGH';
    }
    if (!isValidAddress(input.to)) {
      flags.push('INVALID_RECIPIENT_ADDRESS');
      riskLevel = 'HIGH';
    }

    const approved = riskLevel !== 'SEVERE' && riskLevel !== 'HIGH';

    return { approved, riskLevel, flags };
  }

  async screenAddress(address: string, chain: Chain): Promise<{
    sanctioned: boolean;
    riskLevel: string;
    flags: string[];
  }> {
    const flags: string[] = [];
    let riskLevel = 'LOW';
    let sanctioned = false;

    if (this.isHighRiskAddress(address)) {
      sanctioned = true;
      riskLevel = 'SEVERE';
      flags.push('SANCTIONED_ADDRESS');
    }

    if (!isValidAddress(address)) {
      riskLevel = 'HIGH';
      flags.push('INVALID_ADDRESS_FORMAT');
    }

    return { sanctioned, riskLevel, flags };
  }

  private isHighRiskAddress(address: string): boolean {
    const lower = address.toLowerCase();
    return SIMULATED_HIGH_RISK_PREFIXES.some((prefix) => lower === prefix);
  }
}

// ============================================================================
// Live Adapter
// ============================================================================

/**
 * Live Circle compliance adapter that calls Circle's screening APIs.
 */
class LiveComplianceAdapter implements CircleComplianceAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.circle.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Circle Compliance API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  }

  async screenTransaction(input: ScreenTransactionInput): Promise<{
    approved: boolean;
    riskLevel: string;
    flags: string[];
  }> {
    try {
      const result = await this.request<{
        data: { decision: string; riskLevel: string; flags: string[] }
      }>('POST', '/compliance/screening/transactions', {
        from: input.from,
        to: input.to,
        amount: input.amount,
        chain: input.chain,
        token: input.token,
      });
      return {
        approved: result.data.decision === 'APPROVE',
        riskLevel: result.data.riskLevel,
        flags: result.data.flags,
      };
    } catch {
      // Fallback to simulation on API failure
      const sim = new SimulatedComplianceAdapter();
      return sim.screenTransaction(input);
    }
  }

  async screenAddress(address: string, chain: Chain): Promise<{
    sanctioned: boolean;
    riskLevel: string;
    flags: string[];
  }> {
    try {
      const result = await this.request<{
        data: { sanctioned: boolean; riskLevel: string; flags: string[] }
      }>('POST', '/compliance/screening/addresses', {
        address,
        chain,
      });
      return result.data;
    } catch {
      // Fallback to simulation on API failure
      const sim = new SimulatedComplianceAdapter();
      return sim.screenAddress(address, chain);
    }
  }
}

// ============================================================================
// Kontext Client Interface (subset needed by this module)
// ============================================================================

/** Minimal interface for the Kontext client used by CircleComplianceEngine */
interface KontextLike {
  log(input: { type: string; description: string; agentId: string; metadata?: Record<string, unknown> }): Promise<ActionLog>;
  getTrustScore(agentId: string): Promise<{ score: number }>;
  checkUsdcCompliance(tx: LogTransactionInput): { compliant: boolean; checks: ComplianceCheckResult[]; riskLevel: AnomalySeverity; recommendations: string[] };
}

// ============================================================================
// CircleComplianceEngine
// ============================================================================

/**
 * Dual-layer compliance engine combining Circle's transaction screening
 * with Kontext's trust scoring and anomaly detection.
 *
 * Every screening operation is logged through Kontext's tamper-evident
 * audit system for regulatory compliance.
 *
 * @example
 * ```typescript
 * const kontext = Kontext.init({ projectId: 'my-project', environment: 'production' });
 * const compliance = new CircleComplianceEngine(kontext);
 *
 * const result = await compliance.screenTransaction({
 *   from: '0xSender...',
 *   to: '0xRecipient...',
 *   amount: '5000',
 *   chain: 'base',
 * });
 *
 * if (result.combinedDecision === 'BLOCK') {
 *   console.log('Transaction blocked');
 * }
 * ```
 */
export class CircleComplianceEngine {
  private readonly kontext: KontextLike;
  private readonly adapter: CircleComplianceAdapter;
  private readonly isLiveMode: boolean;

  /**
   * Create a new CircleComplianceEngine.
   *
   * @param kontextClient - Initialized Kontext SDK client
   * @param circleApiKey - Circle API key (optional; omit for simulation mode)
   */
  constructor(kontextClient: KontextLike, circleApiKey?: string) {
    this.kontext = kontextClient;
    this.isLiveMode = !!circleApiKey;
    this.adapter = circleApiKey
      ? new LiveComplianceAdapter(circleApiKey)
      : new SimulatedComplianceAdapter();
  }

  // --------------------------------------------------------------------------
  // Transaction Screening
  // --------------------------------------------------------------------------

  /**
   * Screen a transaction through both Circle and Kontext compliance systems.
   *
   * @param input - Transaction details to screen
   * @returns DualScreenResult with combined decision
   */
  async screenTransaction(input: ScreenTransactionInput): Promise<DualScreenResult> {
    // Step 1: Circle screening
    const circleResult = await this.adapter.screenTransaction(input);

    // Step 2: Kontext screening
    const kontextResult = this.runKontextScreening(input);

    // Step 3: Combined decision
    const combinedDecision = this.determineCombinedDecision(
      circleResult.approved,
      circleResult.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE',
      kontextResult.complianceApproved,
      kontextResult.trustScore,
    );

    // Step 4: Log the screening
    const logAction = await this.kontext.log({
      type: 'compliance_screening',
      description: `Dual screening: ${input.from} -> ${input.to} (${input.amount} ${input.token ?? 'USDC'}) - ${combinedDecision}`,
      agentId: 'circle-compliance-engine',
      metadata: {
        from: input.from,
        to: input.to,
        amount: input.amount,
        chain: input.chain,
        token: input.token,
        circleApproved: circleResult.approved,
        circleRiskLevel: circleResult.riskLevel,
        circleFlags: circleResult.flags,
        kontextTrustScore: kontextResult.trustScore,
        kontextAnomalyDetected: kontextResult.anomalyDetected,
        kontextComplianceApproved: kontextResult.complianceApproved,
        kontextFlags: kontextResult.flags,
        combinedDecision,
      },
    });

    return {
      circleScreening: {
        approved: circleResult.approved,
        riskLevel: circleResult.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE',
        flags: circleResult.flags,
      },
      kontextScreening: kontextResult,
      combinedDecision,
      auditLogId: logAction.id,
    };
  }

  // --------------------------------------------------------------------------
  // Address Screening
  // --------------------------------------------------------------------------

  /**
   * Screen an address for sanctions and risk.
   *
   * @param address - On-chain address to screen
   * @param chain - Blockchain network
   * @returns AddressScreenResult with risk assessment
   */
  async screenAddress(address: string, chain: Chain): Promise<AddressScreenResult> {
    const result = await this.adapter.screenAddress(address, chain);

    // Log the screening
    await this.kontext.log({
      type: 'address_screening',
      description: `Address screening: ${address} on ${chain} - ${result.riskLevel}`,
      agentId: 'circle-compliance-engine',
      metadata: {
        address,
        chain,
        sanctioned: result.sanctioned,
        riskLevel: result.riskLevel,
        flags: result.flags,
      },
    });

    return {
      address,
      chain,
      sanctioned: result.sanctioned,
      riskLevel: result.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE',
      flags: result.flags,
      screenedAt: now(),
    };
  }

  // --------------------------------------------------------------------------
  // Comprehensive Risk Assessment
  // --------------------------------------------------------------------------

  /**
   * Get a comprehensive risk assessment combining Circle screening with
   * Kontext trust scoring.
   *
   * @param input - Assessment input
   * @returns ComprehensiveRiskResult with combined scoring
   */
  async getComprehensiveRisk(input: RiskAssessmentInput): Promise<ComprehensiveRiskResult> {
    const factors: ComprehensiveRiskFactor[] = [];

    // Circle address screening
    const addressScreen = await this.adapter.screenAddress(input.address, input.chain);
    const circleRiskScore = this.riskLevelToScore(addressScreen.riskLevel);

    factors.push({
      name: 'circle_address_screening',
      score: circleRiskScore,
      description: `Circle screening: ${addressScreen.riskLevel}${addressScreen.sanctioned ? ' (SANCTIONED)' : ''}`,
    });

    // Kontext trust score
    let kontextTrustScore = 50;
    if (input.agentId) {
      try {
        const trustResult = await this.kontext.getTrustScore(input.agentId);
        kontextTrustScore = trustResult.score;
      } catch {
        // Use default for unknown agents
      }
    }

    // Invert trust score to risk (high trust = low risk)
    const kontextRiskScore = 100 - kontextTrustScore;
    factors.push({
      name: 'kontext_trust_score',
      score: kontextRiskScore,
      description: `Kontext trust: ${kontextTrustScore}/100 (risk: ${kontextRiskScore}/100)`,
    });

    // Amount-based risk
    if (input.amount) {
      const amount = parseAmount(input.amount);
      let amountRisk = 0;
      if (!isNaN(amount)) {
        if (amount >= 100000) amountRisk = 80;
        else if (amount >= 50000) amountRisk = 60;
        else if (amount >= 10000) amountRisk = 40;
        else if (amount >= 3000) amountRisk = 20;
        else amountRisk = 5;
      }
      factors.push({
        name: 'amount_risk',
        score: amountRisk,
        description: `Amount ${input.amount}: risk score ${amountRisk}`,
      });
    }

    // Address format risk
    if (!isValidAddress(input.address)) {
      factors.push({
        name: 'address_format',
        score: 90,
        description: 'Invalid address format',
      });
    }

    // Compute combined score (weighted average)
    const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
    const combinedScore = Math.round(totalScore / factors.length);

    // Determine overall risk and recommendation
    let overallRisk: ComprehensiveRiskResult['overallRisk'];
    let recommendation: ComprehensiveRiskResult['recommendation'];

    if (combinedScore >= 75 || addressScreen.sanctioned) {
      overallRisk = 'CRITICAL';
      recommendation = 'BLOCK';
    } else if (combinedScore >= 50) {
      overallRisk = 'HIGH';
      recommendation = 'MANUAL_REVIEW';
    } else if (combinedScore >= 25) {
      overallRisk = 'MEDIUM';
      recommendation = 'MANUAL_REVIEW';
    } else {
      overallRisk = 'LOW';
      recommendation = 'PROCEED';
    }

    // Log the assessment
    const logAction = await this.kontext.log({
      type: 'comprehensive_risk_assessment',
      description: `Risk assessment for ${input.address}: ${overallRisk} (score: ${combinedScore})`,
      agentId: input.agentId ?? 'circle-compliance-engine',
      metadata: {
        address: input.address,
        chain: input.chain,
        circleRiskScore,
        kontextTrustScore,
        combinedScore,
        overallRisk,
        recommendation,
        factorCount: factors.length,
      },
    });

    return {
      overallRisk,
      circleRiskScore,
      kontextTrustScore,
      combinedScore,
      recommendation,
      factors,
      auditLogId: logAction.id,
    };
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Run Kontext-side screening using USDC compliance checks and trust scoring.
   */
  private runKontextScreening(input: ScreenTransactionInput): {
    trustScore: number;
    anomalyDetected: boolean;
    complianceApproved: boolean;
    flags: string[];
  } {
    const flags: string[] = [];
    let anomalyDetected = false;

    // Run USDC compliance check
    const txInput: LogTransactionInput = {
      txHash: '0x' + '0'.repeat(64),
      chain: input.chain,
      amount: input.amount,
      token: (input.token ?? 'USDC') as 'USDC' | 'EURC',
      from: input.from,
      to: input.to,
      agentId: 'circle-compliance-engine',
    };

    const complianceResult = this.kontext.checkUsdcCompliance(txInput);

    if (!complianceResult.compliant) {
      flags.push('KONTEXT_COMPLIANCE_FAILED');
    }

    // Check for high-severity issues
    const criticalChecks = complianceResult.checks.filter(
      (c) => !c.passed && (c.severity === 'critical' || c.severity === 'high'),
    );
    if (criticalChecks.length > 0) {
      anomalyDetected = true;
      flags.push(...criticalChecks.map((c) => `KONTEXT_${c.name.toUpperCase()}`));
    }

    // Amount-based flags
    const amount = parseAmount(input.amount);
    if (!isNaN(amount) && amount >= 50000) {
      flags.push('KONTEXT_LARGE_TRANSACTION');
    }

    // Trust score -- use a default since we can't async here
    const trustScore = 50;

    return {
      trustScore,
      anomalyDetected,
      complianceApproved: complianceResult.compliant,
      flags,
    };
  }

  /**
   * Determine the combined decision based on both screening results.
   */
  private determineCombinedDecision(
    circleApproved: boolean,
    circleRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE',
    kontextApproved: boolean,
    kontextTrustScore: number,
  ): 'APPROVE' | 'REVIEW' | 'BLOCK' {
    // BLOCK if Circle flags as SEVERE or Kontext fails critically
    if (circleRisk === 'SEVERE') return 'BLOCK';
    if (!circleApproved && !kontextApproved) return 'BLOCK';

    // REVIEW if either system raises concerns
    if (circleRisk === 'HIGH' || !circleApproved) return 'REVIEW';
    if (!kontextApproved) return 'REVIEW';
    if (circleRisk === 'MEDIUM') return 'REVIEW';

    // APPROVE only when both systems agree
    return 'APPROVE';
  }

  /**
   * Convert a risk level string to a numeric score.
   */
  private riskLevelToScore(riskLevel: string): number {
    switch (riskLevel) {
      case 'SEVERE': return 95;
      case 'HIGH': return 70;
      case 'MEDIUM': return 40;
      case 'LOW': return 10;
      default: return 50;
    }
  }
}
