import { describe, it, expect } from 'vitest';
import { PaymentCompliance } from '../src/integrations/payment-compliance.js';

// Name-based OFAC screening requires the optional ofac-sanctions module.
// In CI (free-tier build), only address screening is available.
let hasNameScreening = false;
try {
  require('../src/integrations/ofac-sanctions.js');
  hasNameScreening = true;
} catch {
  // module not available
}

describe('PaymentCompliance.checkPayment()', () => {
  const PAYMENT = {
    amount: '5000',
    currency: 'USD',
    from: 'Acme Corporation',
    to: 'Global Payments Inc',
    agentId: 'ap-system',
    paymentMethod: 'wire',
  };

  it('should return compliant for clean payment', () => {
    const result = PaymentCompliance.checkPayment(PAYMENT);

    expect(result.compliant).toBe(true);
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasNameScreening)('should flag sanctioned entity name as sender', () => {
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      from: 'Lazarus Group',
    });

    expect(result.compliant).toBe(false);
    expect(result.riskLevel).toBe('critical');
    const screening = result.checks.find((c) => c.name === 'entity_screening_sender');
    expect(screening).toBeDefined();
    expect(screening!.passed).toBe(false);
    expect(screening!.description).toContain('Lazarus');
  });

  it.skipIf(!hasNameScreening)('should flag sanctioned entity name as recipient', () => {
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      to: 'Garantex Exchange',
    });

    expect(result.compliant).toBe(false);
    expect(result.riskLevel).toBe('critical');
    const screening = result.checks.find((c) => c.name === 'entity_screening_recipient');
    expect(screening).toBeDefined();
    expect(screening!.passed).toBe(false);
  });

  it('should pass for non-sanctioned entity names', () => {
    const result = PaymentCompliance.checkPayment(PAYMENT);

    const senderCheck = result.checks.find((c) => c.name === 'entity_screening_sender');
    const recipientCheck = result.checks.find((c) => c.name === 'entity_screening_recipient');
    expect(senderCheck!.passed).toBe(true);
    expect(recipientCheck!.passed).toBe(true);
  });

  it('should fall back to address screening for 0x addresses', () => {
    // Use a known sanctioned address
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      to: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96', // Lazarus Group
    });

    expect(result.compliant).toBe(false);
    const screening = result.checks.find((c) => c.name === 'entity_screening_recipient');
    expect(screening!.passed).toBe(false);
    expect(screening!.severity).toBe('critical');
  });

  it('should validate amount', () => {
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      amount: '-100',
    });

    expect(result.compliant).toBe(false);
    const amountCheck = result.checks.find((c) => c.name === 'amount_valid');
    expect(amountCheck!.passed).toBe(false);
  });

  it('should flag enhanced due diligence for amounts >= $3000', () => {
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      amount: '3500',
    });

    const eddCheck = result.checks.find((c) => c.name === 'enhanced_due_diligence');
    expect(eddCheck).toBeDefined();
    expect(eddCheck!.severity).toBe('medium');
  });

  it('should flag reporting threshold for amounts >= $10000', () => {
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      amount: '15000',
    });

    const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(reportCheck).toBeDefined();
    expect(reportCheck!.severity).toBe('medium');
  });

  it('should flag large payment for amounts >= $50000', () => {
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      amount: '75000',
    });

    const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(reportCheck).toBeDefined();
    expect(reportCheck!.severity).toBe('high');
  });

  it.skipIf(!hasNameScreening)('should generate recommendations for flagged payments', () => {
    const result = PaymentCompliance.checkPayment({
      ...PAYMENT,
      to: 'Lazarus Group',
      amount: '15000',
    });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes('BLOCK'))).toBe(true);
  });

  it('should not require crypto fields', () => {
    // No txHash, chain, or token — should work fine
    const result = PaymentCompliance.checkPayment({
      amount: '1000',
      from: 'Sender Inc',
      to: 'Receiver Corp',
      agentId: 'test-agent',
    });

    expect(result.compliant).toBe(true);
  });
});
