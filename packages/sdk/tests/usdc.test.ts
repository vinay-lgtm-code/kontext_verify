import { describe, it, expect } from 'vitest';
import { UsdcCompliance } from '../src/integrations/usdc.js';
import type { LogTransactionInput } from '../src/types.js';

function createTx(overrides: Partial<LogTransactionInput> = {}): LogTransactionInput {
  return {
    txHash: '0x' + 'a'.repeat(64),
    chain: 'base',
    amount: '100',
    token: 'USDC',
    from: '0x' + '1'.repeat(40),
    to: '0x' + '2'.repeat(40),
    agentId: 'agent-1',
    ...overrides,
  };
}

describe('UsdcCompliance', () => {
  it('should pass a valid small USDC transaction', () => {
    const result = UsdcCompliance.checkTransaction(createTx());
    expect(result.compliant).toBe(true);
    expect(result.riskLevel).toBe('low');
  });

  it('should flag non-USDC tokens', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ token: 'DAI' }),
    );
    const tokenCheck = result.checks.find((c) => c.name === 'token_type');
    expect(tokenCheck?.passed).toBe(false);
  });

  it('should flag invalid sender address', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ from: 'invalid-address' }),
    );
    const addressCheck = result.checks.find((c) => c.name === 'address_format_sender');
    expect(addressCheck?.passed).toBe(false);
  });

  it('should flag invalid recipient address', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ to: 'not-an-address' }),
    );
    const addressCheck = result.checks.find((c) => c.name === 'address_format_recipient');
    expect(addressCheck?.passed).toBe(false);
  });

  it('should flag large transactions for enhanced monitoring', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ amount: '75000' }),
    );
    const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(reportCheck?.severity).toBe('high');
  });

  it('should flag amounts at reporting threshold', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ amount: '10000' }),
    );
    const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(reportCheck?.severity).toBe('medium');
  });

  it('should flag enhanced due diligence for amounts over 3000', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ amount: '5000' }),
    );
    const eddCheck = result.checks.find((c) => c.name === 'enhanced_due_diligence');
    expect(eddCheck?.severity).toBe('medium');
  });

  it('should provide recommendations for large transactions', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ amount: '60000' }),
    );
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes('manual review'))).toBe(true);
  });

  it('should return supported chains', () => {
    const chains = UsdcCompliance.getSupportedChains();
    expect(chains).toContain('ethereum');
    expect(chains).toContain('base');
    expect(chains).toContain('arc');
  });

  it('should return contract addresses', () => {
    const addr = UsdcCompliance.getContractAddress('base');
    expect(addr).toBeDefined();
    expect(addr).toMatch(/^0x/);
  });

  it('should return Arc contract address', () => {
    const addr = UsdcCompliance.getContractAddress('arc');
    expect(addr).toBeDefined();
    expect(addr).toMatch(/^0x/);
  });

  it('should pass compliance check for Arc chain', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ chain: 'arc' }),
    );
    const chainCheck = result.checks.find((c) => c.name === 'chain_support');
    expect(chainCheck?.passed).toBe(true);
  });

  it('should flag invalid amounts', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ amount: 'not-a-number' }),
    );
    const amountCheck = result.checks.find((c) => c.name === 'amount_valid');
    expect(amountCheck?.passed).toBe(false);
  });
});
