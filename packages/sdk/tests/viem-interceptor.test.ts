import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withKontextCompliance,
  ViemComplianceError,
} from '../src/integrations/viem-interceptor.js';
import type { ViemInstrumentationOptions, WalletClientLike, KontextForInterceptor } from '../src/integrations/viem-interceptor.js';
import type { VerifyInput, VerifyResult } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const RANDOM_CONTRACT = '0x1234567890abcdef1234567890abcdef12345678';

// transfer(address to, uint256 amount) for 5000 USDC (6 decimals = 5000 * 10^6)
const TRANSFER_5000_USDC =
  '0xa9059cbb' +
  '0000000000000000000000002222222222222222222222222222222222222222' +
  '000000000000000000000000000000000000000000000000000000012a05f200';

// transferFrom(address from, address to, uint256 amount)
const TRANSFER_FROM_5000_USDC =
  '0x23b872dd' +
  '0000000000000000000000001111111111111111111111111111111111111111' +
  '0000000000000000000000002222222222222222222222222222222222222222' +
  '000000000000000000000000000000000000000000000000000000012a05f200';

// approve(address spender, uint256 amount) — should NOT trigger
const APPROVE_CALLDATA =
  '0x095ea7b3' +
  '0000000000000000000000002222222222222222222222222222222222222222' +
  '000000000000000000000000000000000000000000000000000000012a05f200';

function createMockClient(overrides?: Partial<WalletClientLike>): WalletClientLike & { _sent: any[] } {
  const sent: any[] = [];
  const base: any = {
    chain: { id: 8453, name: 'Base' },
    account: { address: '0x' + '1'.repeat(40) as `0x${string}` },
    sendTransaction: async (params: any) => {
      sent.push({ type: 'sendTransaction', params });
      return ('0x' + 'f'.repeat(64)) as `0x${string}`;
    },
    writeContract: async (params: any) => {
      sent.push({ type: 'writeContract', params });
      return ('0x' + 'e'.repeat(64)) as `0x${string}`;
    },
    extend<T>(fn: (client: any) => T) {
      return { ...this, ...fn(this) };
    },
    _sent: sent,
    ...overrides,
  };
  return base;
}

function createMockKontext(overrides?: {
  compliant?: boolean;
}): KontextForInterceptor & { verifyCalls: VerifyInput[] } {
  const verifyCalls: VerifyInput[] = [];
  const compliant = overrides?.compliant ?? true;
  return {
    verifyCalls,
    verify: async (input: VerifyInput): Promise<VerifyResult> => {
      verifyCalls.push(input);
      return {
        compliant,
        checks: [],
        riskLevel: 'low',
        recommendations: compliant ? [] : ['Blocked by OFAC screening'],
        transaction: { id: 'tx-1' } as any,
        trustScore: { agentId: input.agentId, score: 85 } as any,
        anomalies: [],
        digestProof: { terminalDigest: 'abc', chainLength: 1, valid: true },
      } as any;
    },
    getConfig: () => ({
      agentId: 'test-agent',
      interceptorMode: 'post-send',
      policy: {},
    }),
    getWalletMonitor: () => null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('withKontextCompliance', () => {
  describe('pass-through (no interception)', () => {
    it('should pass through non-stablecoin transactions', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      const txHash = await wrapped.sendTransaction({
        to: RANDOM_CONTRACT,
        data: TRANSFER_5000_USDC,
        value: 0n,
      });

      expect(txHash).toBe('0x' + 'f'.repeat(64));
      expect(kontext.verifyCalls).toHaveLength(0);
    });

    it('should pass through stablecoin transactions with non-transfer selectors', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      await wrapped.sendTransaction({
        to: USDC_BASE,
        data: APPROVE_CALLDATA,
      });

      expect(kontext.verifyCalls).toHaveLength(0);
    });

    it('should pass through stablecoin transactions with no data', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      await wrapped.sendTransaction({ to: USDC_BASE });
      expect(kontext.verifyCalls).toHaveLength(0);
    });
  });

  describe('sendTransaction interception', () => {
    it('should intercept ERC-20 transfer on stablecoin contract', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      const txHash = await wrapped.sendTransaction({
        to: USDC_BASE,
        data: TRANSFER_5000_USDC,
      });

      // Transaction still goes through
      expect(txHash).toBe('0x' + 'f'.repeat(64));

      // Wait for fire-and-forget verify to complete
      await new Promise((r) => setTimeout(r, 50));

      expect(kontext.verifyCalls).toHaveLength(1);
      const call = kontext.verifyCalls[0]!;
      expect(call.chain).toBe('base');
      expect(call.token).toBe('USDC');
      expect(call.amount).toBe('5000');
      expect(call.to).toBe('0x' + '2'.repeat(40));
      expect(call.agentId).toBe('test-agent');
      expect(call.txHash).toBe('0x' + 'f'.repeat(64));
    });

    it('should intercept transferFrom with correct from address', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      await wrapped.sendTransaction({
        to: USDC_BASE,
        data: TRANSFER_FROM_5000_USDC,
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(kontext.verifyCalls).toHaveLength(1);
      const call = kontext.verifyCalls[0]!;
      expect(call.from).toBe('0x' + '1'.repeat(40));
      expect(call.to).toBe('0x' + '2'.repeat(40));
    });

    it('should be case-insensitive for contract addresses', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      await wrapped.sendTransaction({
        to: '0x833589FCD6eDb6E08f4c7C32D4f71b54bdA02913', // mixed case
        data: TRANSFER_5000_USDC,
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(kontext.verifyCalls).toHaveLength(1);
    });
  });

  describe('writeContract interception', () => {
    it('should intercept writeContract transfer', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      await wrapped.writeContract!({
        address: USDC_BASE,
        functionName: 'transfer',
        args: ['0x' + '2'.repeat(40), 5000000000n],
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(kontext.verifyCalls).toHaveLength(1);
      expect(kontext.verifyCalls[0]!.amount).toBe('5000');
    });

    it('should pass through writeContract approve', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      await wrapped.writeContract!({
        address: USDC_BASE,
        functionName: 'approve',
        args: ['0x' + '2'.repeat(40), 5000000000n],
      });

      expect(kontext.verifyCalls).toHaveLength(0);
    });

    it('should pass through writeContract on non-stablecoin', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      await wrapped.writeContract!({
        address: RANDOM_CONTRACT,
        functionName: 'transfer',
        args: ['0x' + '2'.repeat(40), 5000000000n],
      });

      expect(kontext.verifyCalls).toHaveLength(0);
    });
  });

  describe('pre-send mode', () => {
    it('should allow compliant transactions', async () => {
      const client = createMockClient();
      const kontext = createMockKontext({ compliant: true });
      const wrapped = withKontextCompliance(client, kontext, { mode: 'pre-send' });

      const txHash = await wrapped.sendTransaction({
        to: USDC_BASE,
        data: TRANSFER_5000_USDC,
      });

      expect(txHash).toBe('0x' + 'f'.repeat(64));
      expect(kontext.verifyCalls).toHaveLength(1);
      expect(kontext.verifyCalls[0]!.txHash).toBe('pre-screening');
    });

    it('should block non-compliant transactions', async () => {
      const client = createMockClient();
      const kontext = createMockKontext({ compliant: false });
      const wrapped = withKontextCompliance(client, kontext, { mode: 'pre-send' });

      await expect(
        wrapped.sendTransaction({
          to: USDC_BASE,
          data: TRANSFER_5000_USDC,
        }),
      ).rejects.toThrow(ViemComplianceError);

      // Transaction was never sent
      expect(client._sent).toHaveLength(0);
    });

    it('should include VerifyResult in ViemComplianceError', async () => {
      const client = createMockClient();
      const kontext = createMockKontext({ compliant: false });
      const wrapped = withKontextCompliance(client, kontext, { mode: 'pre-send' });

      try {
        await wrapped.sendTransaction({
          to: USDC_BASE,
          data: TRANSFER_5000_USDC,
        });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ViemComplianceError);
        const compErr = err as ViemComplianceError;
        expect(compErr.result.compliant).toBe(false);
        expect(compErr.amount).toBe('5000');
      }
    });
  });

  describe('callbacks', () => {
    it('should call onVerify after successful verify', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const onVerify = vi.fn();
      const wrapped = withKontextCompliance(client, kontext, { onVerify });

      await wrapped.sendTransaction({
        to: USDC_BASE,
        data: TRANSFER_5000_USDC,
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(onVerify).toHaveBeenCalledOnce();
      expect(onVerify).toHaveBeenCalledWith(
        expect.objectContaining({ compliant: true }),
        '0x' + 'f'.repeat(64),
      );
    });

    it('should call onError when verify fails', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      kontext.verify = async () => { throw new Error('Network error'); };
      const onError = vi.fn();
      const wrapped = withKontextCompliance(client, kontext, { onError });

      const txHash = await wrapped.sendTransaction({
        to: USDC_BASE,
        data: TRANSFER_5000_USDC,
      });

      // Transaction still succeeds
      expect(txHash).toBe('0x' + 'f'.repeat(64));

      await new Promise((r) => setTimeout(r, 50));
      expect(onError).toHaveBeenCalledOnce();
    });
  });

  describe('token/chain filtering', () => {
    it('should only intercept specified tokens', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      // Only intercept USDT, not USDC
      const wrapped = withKontextCompliance(client, kontext, { tokens: ['USDT'] });

      await wrapped.sendTransaction({
        to: USDC_BASE, // This is USDC, should pass through
        data: TRANSFER_5000_USDC,
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(kontext.verifyCalls).toHaveLength(0);
    });
  });

  describe('amount formatting', () => {
    it('should format 6-decimal amounts correctly', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext);

      // 1.5 USDC = 1500000 in 6-decimal
      const data =
        '0xa9059cbb' +
        '0000000000000000000000002222222222222222222222222222222222222222' +
        '000000000000000000000000000000000000000000000000000000000016e360';

      await wrapped.sendTransaction({ to: USDC_BASE, data });
      await new Promise((r) => setTimeout(r, 50));

      expect(kontext.verifyCalls[0]!.amount).toBe('1.5');
    });
  });

  describe('metadata', () => {
    it('should include source metadata', async () => {
      const client = createMockClient();
      const kontext = createMockKontext();
      const wrapped = withKontextCompliance(client, kontext, {
        metadata: { customField: 'test' },
      });

      await wrapped.sendTransaction({
        to: USDC_BASE,
        data: TRANSFER_5000_USDC,
      });

      await new Promise((r) => setTimeout(r, 50));
      const meta = kontext.verifyCalls[0]!.metadata as Record<string, unknown>;
      expect(meta['source']).toBe('viem-auto-instrumentation');
      expect(meta['customField']).toBe('test');
    });
  });
});
