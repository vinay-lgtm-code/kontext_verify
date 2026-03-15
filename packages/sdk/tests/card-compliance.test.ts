import { describe, it, expect, afterEach } from 'vitest';
import {
  Kontext,
  CardCompliance,
  isCardTransaction,
  isBankTransaction,
  isCryptoTransaction,
} from '../src/index.js';
import type { LogTransactionInput } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createClient() {
  return Kontext.init({
    projectId: 'card-test',
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

describe('isCardTransaction', () => {
  it('returns true when paymentMethod is card', () => {
    expect(isCardTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', paymentMethod: 'card' })).toBe(true);
  });

  it('returns true when instrument type is virtual_card', () => {
    expect(isCardTransaction({
      amount: '100', from: 'a', to: 'b', agentId: 'x',
      instrument: { instrumentId: 'tok', instrumentType: 'virtual_card', instrumentNetwork: 'visa' },
    })).toBe(true);
  });

  it('returns true when cardNetwork is set', () => {
    expect(isCardTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', cardNetwork: 'visa' })).toBe(true);
  });

  it('returns true when cardLast4 is set', () => {
    expect(isCardTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', cardLast4: '4242' })).toBe(true);
  });

  it('returns false for crypto transaction', () => {
    expect(isCardTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', txHash: '0x1', chain: 'base', token: 'USDC' })).toBe(false);
  });

  it('returns false for plain payment', () => {
    expect(isCardTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x' })).toBe(false);
  });
});

describe('isBankTransaction', () => {
  it('returns true when paymentMethod is bank', () => {
    expect(isBankTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', paymentMethod: 'bank' })).toBe(true);
  });

  it('returns true when instrument type is bank_account', () => {
    expect(isBankTransaction({
      amount: '100', from: 'a', to: 'b', agentId: 'x',
      instrument: { instrumentId: 'tok', instrumentType: 'bank_account', instrumentNetwork: 'ach' },
    })).toBe(true);
  });

  it('returns false for card transaction', () => {
    expect(isBankTransaction({ amount: '100', from: 'a', to: 'b', agentId: 'x', paymentMethod: 'card' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CardCompliance.checkPayment
// ---------------------------------------------------------------------------

describe('CardCompliance.checkPayment', () => {
  const baseInput: LogTransactionInput = {
    amount: '500',
    currency: 'USD',
    from: 'treasury-agent',
    to: 'AWS Inc',
    agentId: 'test-agent',
    paymentMethod: 'card',
    cardNetwork: 'visa',
    cardLast4: '4242',
    merchantName: 'AWS Inc',
    merchantCountry: 'US',
  };

  it('returns compliant for a normal card payment', () => {
    const result = CardCompliance.checkPayment(baseInput);
    expect(result.compliant).toBe(true);
    expect(result.riskLevel).toBe('low');
  });

  it('returns checks array with all expected check names', () => {
    const result = CardCompliance.checkPayment(baseInput);
    const checkNames = result.checks.map((c) => c.name);
    expect(checkNames).toContain('amount_valid');
    expect(checkNames).toContain('entity_screening_merchant');
    expect(checkNames).toContain('entity_screening_cardholder');
    expect(checkNames).toContain('enhanced_due_diligence');
    expect(checkNames).toContain('reporting_threshold');
    expect(checkNames).toContain('merchant_category');
    expect(checkNames).toContain('three_d_secure');
    expect(checkNames).toContain('instrument_scope');
    expect(checkNames).toContain('merchant_country');
  });

  it('flags invalid amount', () => {
    const result = CardCompliance.checkPayment({ ...baseInput, amount: '-100' });
    expect(result.compliant).toBe(false);
    const amountCheck = result.checks.find((c) => c.name === 'amount_valid');
    expect(amountCheck?.passed).toBe(false);
    expect(amountCheck?.severity).toBe('critical');
  });

  it('flags enhanced due diligence for amounts >= 3000', () => {
    const result = CardCompliance.checkPayment({ ...baseInput, amount: '5000' });
    const edd = result.checks.find((c) => c.name === 'enhanced_due_diligence');
    expect(edd?.severity).toBe('medium');
  });

  it('flags reporting threshold for amounts >= 10000', () => {
    const result = CardCompliance.checkPayment({ ...baseInput, amount: '15000' });
    const report = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(report?.severity).toBe('medium');
  });

  it('flags large transaction for amounts >= 50000', () => {
    const result = CardCompliance.checkPayment({ ...baseInput, amount: '75000' });
    const report = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(report?.severity).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// MCC check
// ---------------------------------------------------------------------------

describe('CardCompliance.checkMerchantCategory', () => {
  it('flags high-risk MCC 7995 (gambling)', () => {
    const result = CardCompliance.checkMerchantCategory('7995');
    expect(result.passed).toBe(true); // warning, not blocking
    expect(result.severity).toBe('medium');
    expect(result.description).toContain('Gambling');
  });

  it('flags high-risk MCC 6051 (crypto/quasi-cash)', () => {
    const result = CardCompliance.checkMerchantCategory('6051');
    expect(result.severity).toBe('medium');
    expect(result.description).toContain('Crypto');
  });

  it('passes normal MCC', () => {
    const result = CardCompliance.checkMerchantCategory('5411');
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('low');
  });

  it('passes when no MCC provided', () => {
    const result = CardCompliance.checkMerchantCategory(undefined);
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3DS check
// ---------------------------------------------------------------------------

describe('CardCompliance.checkThreeDSecure', () => {
  it('passes when authenticated', () => {
    const result = CardCompliance.checkThreeDSecure('authenticated', '5000');
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('low');
  });

  it('warns when attempted', () => {
    const result = CardCompliance.checkThreeDSecure('attempted', '5000');
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('medium');
  });

  it('fails when not authenticated for high-value payment', () => {
    const result = CardCompliance.checkThreeDSecure('failed', '5000');
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('high');
  });

  it('passes when failed but below threshold', () => {
    const result = CardCompliance.checkThreeDSecure('failed', '500');
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('medium');
  });

  it('fails when none for high-value payment', () => {
    const result = CardCompliance.checkThreeDSecure('none', '5000');
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('high');
  });

  it('passes when no status provided for low-value payment', () => {
    const result = CardCompliance.checkThreeDSecure(undefined, '500');
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Instrument scope check
// ---------------------------------------------------------------------------

describe('CardCompliance.checkInstrumentScope', () => {
  it('passes when no scope provided', () => {
    const result = CardCompliance.checkInstrumentScope({
      amount: '1000', from: 'a', to: 'b', agentId: 'x',
    });
    expect(result.passed).toBe(true);
  });

  it('fails when amount exceeds spend limit', () => {
    const result = CardCompliance.checkInstrumentScope({
      amount: '6000', from: 'a', to: 'b', agentId: 'x',
      cardSpendLimit: '5000',
    });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('high');
    expect(result.description).toContain('spend limit');
  });

  it('fails when amount exceeds max transaction amount from instrument', () => {
    const result = CardCompliance.checkInstrumentScope({
      amount: '15000', from: 'a', to: 'b', agentId: 'x',
      instrument: {
        instrumentId: 'tok', instrumentType: 'virtual_card', instrumentNetwork: 'visa',
        instrumentScope: { maxTransactionAmount: '10000' },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.description).toContain('max transaction limit');
  });

  it('fails when MCC is blocked by scope', () => {
    const result = CardCompliance.checkInstrumentScope({
      amount: '100', from: 'a', to: 'b', agentId: 'x',
      merchantCategoryCode: '7995',
      instrument: {
        instrumentId: 'tok', instrumentType: 'virtual_card', instrumentNetwork: 'visa',
        instrumentScope: { blockedMerchantCategories: ['7995', '6051'] },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.description).toContain('blocked by instrument scope');
  });

  it('fails when currency not in allowed list', () => {
    const result = CardCompliance.checkInstrumentScope({
      amount: '100', from: 'a', to: 'b', agentId: 'x',
      currency: 'EUR',
      instrument: {
        instrumentId: 'tok', instrumentType: 'virtual_card', instrumentNetwork: 'visa',
        instrumentScope: { allowedCurrencies: ['USD'] },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.description).toContain('not in allowed currencies');
  });

  it('fails when merchant country not in allowed list', () => {
    const result = CardCompliance.checkInstrumentScope({
      amount: '100', from: 'a', to: 'b', agentId: 'x',
      merchantCountry: 'DE',
      instrument: {
        instrumentId: 'tok', instrumentType: 'virtual_card', instrumentNetwork: 'visa',
        instrumentScope: { allowedCountries: ['US', 'CA'] },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.description).toContain('not in allowed countries');
  });

  it('passes when within all scope constraints', () => {
    const result = CardCompliance.checkInstrumentScope({
      amount: '500', from: 'a', to: 'b', agentId: 'x',
      currency: 'USD',
      merchantCategoryCode: '5411',
      merchantCountry: 'US',
      instrument: {
        instrumentId: 'tok', instrumentType: 'virtual_card', instrumentNetwork: 'visa',
        instrumentScope: {
          spendLimit: '10000',
          spendLimitPeriod: 'daily',
          allowedCurrencies: ['USD'],
          blockedMerchantCategories: ['7995'],
          allowedCountries: ['US', 'CA'],
        },
      },
    });
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Merchant country check
// ---------------------------------------------------------------------------

describe('CardCompliance.checkMerchantCountry', () => {
  it('blocks sanctioned country (Iran)', () => {
    const result = CardCompliance.checkMerchantCountry('IR');
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('blocks sanctioned country (Cuba)', () => {
    const result = CardCompliance.checkMerchantCountry('CU');
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('blocks sanctioned country (North Korea)', () => {
    const result = CardCompliance.checkMerchantCountry('KP');
    expect(result.passed).toBe(false);
  });

  it('passes non-sanctioned country', () => {
    const result = CardCompliance.checkMerchantCountry('US');
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('low');
  });

  it('passes when no country provided', () => {
    const result = CardCompliance.checkMerchantCountry(undefined);
    expect(result.passed).toBe(true);
  });

  it('handles lowercase country codes', () => {
    const result = CardCompliance.checkMerchantCountry('ir');
    expect(result.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verify() routing
// ---------------------------------------------------------------------------

describe('verify() routes card payments through CardCompliance', () => {
  it('uses CardCompliance for paymentMethod=card', async () => {
    kontext = createClient();
    const result = await kontext.verify({
      amount: '5000',
      currency: 'USD',
      from: 'treasury-agent',
      to: 'AWS Inc',
      agentId: 'test-agent',
      paymentMethod: 'card',
      cardNetwork: 'visa',
      cardLast4: '4242',
      merchantName: 'AWS Inc',
      merchantCountry: 'US',
      threeDSecureStatus: 'authenticated',
    });

    expect(result.compliant).toBe(true);
    expect(result.transaction).toBeDefined();
    expect(result.transaction.paymentMethod).toBe('card');

    // Card-specific checks should be present
    const checkNames = result.checks.map((c) => c.name);
    expect(checkNames).toContain('merchant_category');
    expect(checkNames).toContain('three_d_secure');
    expect(checkNames).toContain('instrument_scope');
    expect(checkNames).toContain('merchant_country');
  });

  it('blocks card payment to sanctioned country via verify()', async () => {
    kontext = createClient();
    const result = await kontext.verify({
      amount: '1000',
      currency: 'USD',
      from: 'agent',
      to: 'Merchant',
      agentId: 'test-agent',
      paymentMethod: 'card',
      merchantCountry: 'IR',
    });

    expect(result.compliant).toBe(false);
    expect(result.riskLevel).toBe('critical');
  });

  it('still routes crypto through UsdcCompliance', async () => {
    kontext = createClient();
    const result = await kontext.verify({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      token: 'USDC',
      amount: '1000',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'test-agent',
    });

    // Should NOT have card-specific checks
    const checkNames = result.checks.map((c) => c.name);
    expect(checkNames).not.toContain('merchant_category');
    expect(checkNames).not.toContain('three_d_secure');
  });
});
