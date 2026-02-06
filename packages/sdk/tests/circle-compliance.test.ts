import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';
import { CircleComplianceEngine } from '../src/integrations/circle-compliance.js';
import type {
  ScreenTransactionInput,
  RiskAssessmentInput,
} from '../src/integrations/circle-compliance.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
  });
}

function createEngine() {
  const kontext = createClient();
  return { kontext, engine: new CircleComplianceEngine(kontext) };
}

function createScreenInput(
  overrides: Partial<ScreenTransactionInput> = {},
): ScreenTransactionInput {
  return {
    from: '0x' + '1'.repeat(40),
    to: '0x' + '2'.repeat(40),
    amount: '100',
    chain: 'base',
    token: 'USDC',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('CircleComplianceEngine', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  describe('screenTransaction', () => {
    it('should approve a standard low-risk transaction', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(createScreenInput());

      expect(result.circleScreening.approved).toBe(true);
      expect(result.circleScreening.riskLevel).toBe('LOW');
      expect(result.kontextScreening.complianceApproved).toBe(true);
      expect(result.combinedDecision).toBe('APPROVE');
      expect(result.auditLogId).toBeDefined();
    });

    it('should block transactions involving sanctioned addresses', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(
        createScreenInput({
          to: '0x000000000000000000000000000000000000dead',
        }),
      );

      expect(result.circleScreening.approved).toBe(false);
      expect(result.circleScreening.riskLevel).toBe('SEVERE');
      expect(result.circleScreening.flags).toContain('SANCTIONED_ADDRESS');
      expect(result.combinedDecision).toBe('BLOCK');
    });

    it('should flag large transactions for review', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(
        createScreenInput({ amount: '75000' }),
      );

      expect(result.circleScreening.riskLevel).not.toBe('LOW');
      expect(['REVIEW', 'BLOCK']).toContain(result.combinedDecision);
    });

    it('should flag very large transactions as high risk', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(
        createScreenInput({ amount: '150000' }),
      );

      expect(result.circleScreening.flags).toContain('VERY_LARGE_AMOUNT');
      expect(result.circleScreening.riskLevel).toBe('HIGH');
    });

    it('should flag invalid sender address', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(
        createScreenInput({ from: 'invalid' }),
      );

      expect(result.circleScreening.flags).toContain('INVALID_SENDER_ADDRESS');
      expect(result.combinedDecision).not.toBe('APPROVE');
    });

    it('should flag invalid recipient address', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(
        createScreenInput({ to: 'bad-address' }),
      );

      expect(result.circleScreening.flags).toContain('INVALID_RECIPIENT_ADDRESS');
    });

    it('should flag invalid amounts', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(
        createScreenInput({ amount: '-500' }),
      );

      expect(result.circleScreening.flags).toContain('INVALID_AMOUNT');
    });

    it('should include audit log ID in result', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(createScreenInput());

      expect(result.auditLogId).toBeDefined();
      expect(typeof result.auditLogId).toBe('string');
      expect(result.auditLogId.length).toBeGreaterThan(0);
    });

    it('should include Kontext screening flags for critical compliance failures', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      // Invalid address should trigger Kontext flags
      const result = await engine.screenTransaction(
        createScreenInput({ from: 'not-valid' }),
      );

      expect(result.kontextScreening.flags.length).toBeGreaterThan(0);
    });

    it('should detect anomalies for large transactions in Kontext screening', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenTransaction(
        createScreenInput({ amount: '60000' }),
      );

      expect(result.kontextScreening.flags).toContain('KONTEXT_LARGE_TRANSACTION');
    });
  });

  describe('screenAddress', () => {
    it('should screen a clean address as low risk', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenAddress('0x' + '1'.repeat(40), 'base');

      expect(result.address).toBe('0x' + '1'.repeat(40));
      expect(result.chain).toBe('base');
      expect(result.sanctioned).toBe(false);
      expect(result.riskLevel).toBe('LOW');
      expect(result.screenedAt).toBeDefined();
    });

    it('should flag sanctioned addresses', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenAddress(
        '0x000000000000000000000000000000000000dead',
        'ethereum',
      );

      expect(result.sanctioned).toBe(true);
      expect(result.riskLevel).toBe('SEVERE');
      expect(result.flags).toContain('SANCTIONED_ADDRESS');
    });

    it('should flag invalid address format', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.screenAddress('not-an-address', 'base');

      expect(result.flags).toContain('INVALID_ADDRESS_FORMAT');
    });
  });

  describe('getComprehensiveRisk', () => {
    it('should return low or medium risk for a clean address without history', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.getComprehensiveRisk({
        address: '0x' + '1'.repeat(40),
        chain: 'base',
      });

      // A clean address with a new agent (default trust 50) results in
      // a moderate combined score -- not CRITICAL or HIGH
      expect(['LOW', 'MEDIUM']).toContain(result.overallRisk);
      expect(['PROCEED', 'MANUAL_REVIEW']).toContain(result.recommendation);
      expect(result.combinedScore).toBeLessThan(75);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.auditLogId).toBeDefined();
    });

    it('should return critical risk for sanctioned address', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.getComprehensiveRisk({
        address: '0x000000000000000000000000000000000000dead',
        chain: 'ethereum',
      });

      expect(result.overallRisk).toBe('CRITICAL');
      expect(result.recommendation).toBe('BLOCK');
      expect(result.circleRiskScore).toBeGreaterThanOrEqual(70);
    });

    it('should factor in amount for risk assessment', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const lowResult = await engine.getComprehensiveRisk({
        address: '0x' + '1'.repeat(40),
        chain: 'base',
        amount: '100',
      });

      const highResult = await engine.getComprehensiveRisk({
        address: '0x' + '1'.repeat(40),
        chain: 'base',
        amount: '150000',
      });

      expect(highResult.combinedScore).toBeGreaterThan(lowResult.combinedScore);
    });

    it('should include agent trust score when agentId provided', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.getComprehensiveRisk({
        address: '0x' + '1'.repeat(40),
        chain: 'base',
        agentId: 'test-agent',
      });

      expect(result.kontextTrustScore).toBeDefined();
      expect(result.kontextTrustScore).toBeGreaterThanOrEqual(0);
      expect(result.kontextTrustScore).toBeLessThanOrEqual(100);
    });

    it('should include multiple risk factors', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.getComprehensiveRisk({
        address: '0x' + '1'.repeat(40),
        chain: 'base',
        amount: '5000',
        agentId: 'agent-1',
      });

      expect(result.factors.length).toBeGreaterThanOrEqual(3);
      const factorNames = result.factors.map((f) => f.name);
      expect(factorNames).toContain('circle_address_screening');
      expect(factorNames).toContain('kontext_trust_score');
      expect(factorNames).toContain('amount_risk');
    });

    it('should flag invalid address format in risk assessment', async () => {
      const { kontext: k, engine } = createEngine();
      kontext = k;

      const result = await engine.getComprehensiveRisk({
        address: 'bad-address',
        chain: 'base',
      });

      const addrFactor = result.factors.find((f) => f.name === 'address_format');
      expect(addrFactor).toBeDefined();
      expect(addrFactor!.score).toBeGreaterThan(50);
    });
  });
});
