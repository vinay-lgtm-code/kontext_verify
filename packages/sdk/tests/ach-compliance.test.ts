import { describe, it, expect, afterEach } from 'vitest';
import {
  Kontext,
  AchCompliance,
  isAchTransaction,
  isBankTransaction,
  isCryptoTransaction,
  isCardTransaction,
} from '../src/index.js';
import type { LogTransactionInput } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createClient() {
  return Kontext.init({
    projectId: 'ach-test',
    environment: 'development',
  });
}

let kontext: ReturnType<typeof createClient>;
afterEach(async () => {
  if (kontext) await kontext.destroy();
});

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe('isAchTransaction', () => {
  it('returns true when paymentMethod is ach', () => {
    expect(isAchTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', paymentMethod: 'ach' })).toBe(true);
  });

  it('returns true when achSecCode is present', () => {
    expect(isAchTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', achSecCode: 'CCD' })).toBe(true);
  });

  it('returns true when achOriginatorId is present', () => {
    expect(isAchTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', achOriginatorId: '1234567890' })).toBe(true);
  });

  it('returns true when achOdfiRoutingNumber is present', () => {
    expect(isAchTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', achOdfiRoutingNumber: '021000021' })).toBe(true);
  });

  it('returns false for crypto transaction', () => {
    expect(isAchTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', txHash: '0x1', chain: 'base', token: 'USDC' })).toBe(false);
  });

  it('returns false for card transaction', () => {
    expect(isAchTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', paymentMethod: 'card' })).toBe(false);
  });

  it('returns false for plain payment', () => {
    expect(isAchTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x' })).toBe(false);
  });
});

describe('isBankTransaction includes ACH', () => {
  it('returns true for paymentMethod ach', () => {
    expect(isBankTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', paymentMethod: 'ach' })).toBe(true);
  });

  it('still returns true for paymentMethod bank', () => {
    expect(isBankTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', paymentMethod: 'bank' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AchCompliance.checkPayment
// ---------------------------------------------------------------------------

describe('AchCompliance.checkPayment', () => {
  const baseInput: LogTransactionInput = {
    amount: '5000',
    currency: 'USD',
    from: 'Acme Corp',
    to: 'Vendor Inc',
    agentId: 'test-agent',
    paymentMethod: 'ach',
    achSecCode: 'CCD',
    achOriginatorName: 'Acme Corp',
    achOriginatorId: '1234567890',
    achOdfiRoutingNumber: '021000021',
    achEntryDescription: 'VENDOR PMT',
    achTransactionType: 'credit',
  };

  it('returns compliant for valid ACH payment', () => {
    const result = AchCompliance.checkPayment(baseInput);
    expect(result.compliant).toBe(true);
    expect(result.checks.length).toBeGreaterThanOrEqual(8);
  });

  it('fails for invalid amount', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, amount: '-100' });
    expect(result.compliant).toBe(false);
    const amountCheck = result.checks.find((c) => c.name === 'amount_valid');
    expect(amountCheck?.passed).toBe(false);
    expect(amountCheck?.severity).toBe('critical');
  });

  it('validates SEC code', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, achSecCode: 'INVALID' });
    expect(result.compliant).toBe(false);
    const secCheck = result.checks.find((c) => c.name === 'sec_code_valid');
    expect(secCheck?.passed).toBe(false);
    expect(secCheck?.severity).toBe('high');
  });

  it('accepts all valid SEC codes', () => {
    const validCodes = ['PPD', 'CCD', 'WEB', 'TEL', 'IAT', 'CTX', 'RCK', 'ARC', 'BOC', 'POP'];
    for (const code of validCodes) {
      const result = AchCompliance.checkPayment({ ...baseInput, achSecCode: code });
      const secCheck = result.checks.find((c) => c.name === 'sec_code_valid');
      expect(secCheck?.passed).toBe(true);
    }
  });

  it('skips SEC code check when not provided', () => {
    const { achSecCode: _, ...input } = baseInput;
    const result = AchCompliance.checkPayment(input);
    const secCheck = result.checks.find((c) => c.name === 'sec_code_valid');
    expect(secCheck?.passed).toBe(true);
    expect(secCheck?.description).toContain('skipping');
  });

  it('validates ODFI routing number format', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, achOdfiRoutingNumber: '12345' });
    const routingCheck = result.checks.find((c) => c.name === 'odfi_routing_format');
    expect(routingCheck?.passed).toBe(false);
    expect(routingCheck?.severity).toBe('high');
  });

  it('validates ODFI routing number checksum', () => {
    // 000000000 has valid format but checksum is 0 (passes trivially)
    // Use a real valid routing number
    const result = AchCompliance.checkPayment({ ...baseInput, achOdfiRoutingNumber: '021000021' });
    const routingCheck = result.checks.find((c) => c.name === 'odfi_routing_format');
    expect(routingCheck?.passed).toBe(true);
  });

  it('fails routing number with bad checksum', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, achOdfiRoutingNumber: '021000022' });
    const routingCheck = result.checks.find((c) => c.name === 'odfi_routing_format');
    expect(routingCheck?.passed).toBe(false);
    expect(routingCheck?.description).toContain('checksum');
  });

  it('enforces same-day ACH $1M limit', () => {
    const result = AchCompliance.checkPayment({
      ...baseInput,
      achSameDay: true,
      amount: '1500000',
    });
    const sameDayCheck = result.checks.find((c) => c.name === 'same_day_ach_limit');
    expect(sameDayCheck?.passed).toBe(false);
    expect(sameDayCheck?.severity).toBe('high');
  });

  it('passes same-day ACH within limit', () => {
    const result = AchCompliance.checkPayment({
      ...baseInput,
      achSameDay: true,
      amount: '500000',
    });
    const sameDayCheck = result.checks.find((c) => c.name === 'same_day_ach_limit');
    expect(sameDayCheck?.passed).toBe(true);
  });

  it('skips same-day check for non-same-day entries', () => {
    const result = AchCompliance.checkPayment(baseInput);
    const sameDayCheck = result.checks.find((c) => c.name === 'same_day_ach_limit');
    expect(sameDayCheck?.passed).toBe(true);
    expect(sameDayCheck?.description).toContain('not applicable');
  });

  it('flags IAT for enhanced screening', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, achSecCode: 'IAT' });
    const iatCheck = result.checks.find((c) => c.name === 'iat_screening');
    expect(iatCheck?.passed).toBe(true);
    expect(iatCheck?.severity).toBe('medium');
    expect(iatCheck?.description).toContain('International ACH Transaction');
  });

  it('flags BSA thresholds (EDD at $3K)', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, amount: '3500' });
    const eddCheck = result.checks.find((c) => c.name === 'enhanced_due_diligence');
    expect(eddCheck?.severity).toBe('medium');
  });

  it('flags BSA thresholds (CTR at $10K)', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, amount: '15000' });
    const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(reportCheck?.severity).toBe('medium');
  });

  it('flags BSA thresholds (large at $50K)', () => {
    const result = AchCompliance.checkPayment({ ...baseInput, amount: '75000' });
    const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(reportCheck?.severity).toBe('high');
  });

  it('checks prefunding adequacy — sufficient', () => {
    const result = AchCompliance.checkPayment({
      ...baseInput,
      achPrefundingBalance: '100000',
      amount: '5000',
    });
    const prefundCheck = result.checks.find((c) => c.name === 'prefunding_adequacy');
    expect(prefundCheck?.passed).toBe(true);
  });

  it('checks prefunding adequacy — insufficient', () => {
    const result = AchCompliance.checkPayment({
      ...baseInput,
      achPrefundingBalance: '1000',
      amount: '5000',
    });
    const prefundCheck = result.checks.find((c) => c.name === 'prefunding_adequacy');
    expect(prefundCheck?.passed).toBe(false);
    expect(prefundCheck?.severity).toBe('high');
  });

  it('skips prefunding check when not provided', () => {
    const result = AchCompliance.checkPayment(baseInput);
    const prefundCheck = result.checks.find((c) => c.name === 'prefunding_adequacy');
    expect(prefundCheck?.passed).toBe(true);
    expect(prefundCheck?.description).toContain('skipping');
  });

  it('generates recommendations for failed checks', () => {
    const result = AchCompliance.checkPayment({
      ...baseInput,
      achSecCode: 'INVALID',
      achSameDay: true,
      amount: '1500000',
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.startsWith('REJECT:'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Routing number checksum
// ---------------------------------------------------------------------------

describe('AchCompliance.validateRoutingChecksum', () => {
  it('validates known good routing numbers', () => {
    expect(AchCompliance.validateRoutingChecksum('021000021')).toBe(true); // JPMorgan Chase
    expect(AchCompliance.validateRoutingChecksum('011401533')).toBe(true); // TD Bank
    expect(AchCompliance.validateRoutingChecksum('091000019')).toBe(true); // Federal Reserve
  });

  it('rejects bad checksums', () => {
    expect(AchCompliance.validateRoutingChecksum('021000022')).toBe(false);
    expect(AchCompliance.validateRoutingChecksum('123456789')).toBe(false);
  });

  it('rejects non-9-digit strings', () => {
    expect(AchCompliance.validateRoutingChecksum('12345')).toBe(false);
    expect(AchCompliance.validateRoutingChecksum('1234567890')).toBe(false);
    expect(AchCompliance.validateRoutingChecksum('abcdefghi')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verify() ACH routing
// ---------------------------------------------------------------------------

describe('verify() routes ACH to AchCompliance', () => {
  it('uses AchCompliance for paymentMethod=ach', async () => {
    kontext = createClient();
    const result = await kontext.verify({
      amount: '5000',
      currency: 'USD',
      from: 'Acme Corp',
      to: 'Vendor Inc',
      agentId: 'test-agent',
      paymentMethod: 'ach',
      achSecCode: 'CCD',
      achOdfiRoutingNumber: '021000021',
    });

    expect(result.compliant).toBe(true);
    // ACH-specific checks should be present
    const checkNames = result.checks.map((c) => c.name);
    expect(checkNames).toContain('sec_code_valid');
    expect(checkNames).toContain('odfi_routing_format');
    expect(checkNames).toContain('same_day_ach_limit');
    expect(checkNames).toContain('iat_screening');
    expect(checkNames).toContain('prefunding_adequacy');
  });

  it('logs ACH fields on the transaction record', async () => {
    kontext = createClient();
    const result = await kontext.verify({
      amount: '5000',
      currency: 'USD',
      from: 'Acme Corp',
      to: 'Vendor Inc',
      agentId: 'test-agent',
      paymentMethod: 'ach',
      achSecCode: 'CCD',
      achOriginatorName: 'Acme Corp',
      achOriginatorId: '1234567890',
      achOdfiRoutingNumber: '021000021',
      achEntryDescription: 'VENDOR PMT',
      achTransactionType: 'credit',
    });

    expect(result.transaction.achSecCode).toBe('CCD');
    expect(result.transaction.achOriginatorName).toBe('Acme Corp');
    expect(result.transaction.achOriginatorId).toBe('1234567890');
    expect(result.transaction.achOdfiRoutingNumber).toBe('021000021');
    expect(result.transaction.achEntryDescription).toBe('VENDOR PMT');
    expect(result.transaction.achTransactionType).toBe('credit');
    expect(result.transaction.description).toContain('ACH');
    expect(result.transaction.description).toContain('CCD');
  });
});
