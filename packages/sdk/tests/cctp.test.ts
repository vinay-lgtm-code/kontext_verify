import { describe, it, expect } from 'vitest';
import { CCTPTransferManager } from '../src/integrations/cctp.js';
import type { InitiateCCTPTransferInput } from '../src/integrations/cctp.js';

function createTransferInput(
  overrides: Partial<InitiateCCTPTransferInput> = {},
): InitiateCCTPTransferInput {
  return {
    sourceChain: 'ethereum',
    destinationChain: 'base',
    amount: '1000',
    token: 'USDC',
    sender: '0x' + '1'.repeat(40),
    recipient: '0x' + '2'.repeat(40),
    sourceTxHash: '0x' + 'a'.repeat(64),
    agentId: 'agent-1',
    ...overrides,
  };
}

describe('CCTPTransferManager', () => {
  describe('validateTransfer', () => {
    it('should validate a valid cross-chain transfer', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(createTransferInput());

      expect(result.valid).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it('should validate a cross-chain transfer to Arc', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ sourceChain: 'ethereum', destinationChain: 'arc' }),
      );

      expect(result.valid).toBe(true);
      expect(result.riskLevel).toBe('low');
      const destCheck = result.checks.find((c) => c.name === 'cctp_destination_chain');
      expect(destCheck?.passed).toBe(true);
    });

    it('should validate a cross-chain transfer from Arc', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ sourceChain: 'arc', destinationChain: 'base' }),
      );

      expect(result.valid).toBe(true);
      const sourceCheck = result.checks.find((c) => c.name === 'cctp_source_chain');
      expect(sourceCheck?.passed).toBe(true);
    });

    it('should reject same source and destination chain', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ sourceChain: 'base', destinationChain: 'base' }),
      );

      expect(result.valid).toBe(false);
      const routeCheck = result.checks.find((c) => c.name === 'cctp_route_validity');
      expect(routeCheck?.passed).toBe(false);
      expect(routeCheck?.severity).toBe('critical');
    });

    it('should flag unsupported tokens', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ token: 'DAI' }),
      );

      expect(result.valid).toBe(false);
      const tokenCheck = result.checks.find((c) => c.name === 'cctp_token_support');
      expect(tokenCheck?.passed).toBe(false);
    });

    it('should accept EURC as a supported CCTP token', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ token: 'EURC' }),
      );

      const tokenCheck = result.checks.find((c) => c.name === 'cctp_token_support');
      expect(tokenCheck?.passed).toBe(true);
    });

    it('should flag invalid amounts', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ amount: '-100' }),
      );

      expect(result.valid).toBe(false);
      const amountCheck = result.checks.find((c) => c.name === 'cctp_amount_validity');
      expect(amountCheck?.passed).toBe(false);
    });

    it('should flag invalid address formats', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ sender: 'invalid-address' }),
      );

      expect(result.valid).toBe(false);
      const addrCheck = result.checks.find((c) => c.name === 'cctp_address_sender');
      expect(addrCheck?.passed).toBe(false);
    });

    it('should provide recommendations for large transfers', () => {
      const manager = new CCTPTransferManager();
      const result = manager.validateTransfer(
        createTransferInput({ amount: '75000' }),
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(
        result.recommendations.some((r) => r.includes('Large cross-chain transfer')),
      ).toBe(true);
    });
  });

  describe('transfer lifecycle', () => {
    it('should initiate a cross-chain transfer', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      expect(transfer.id).toBeDefined();
      expect(transfer.status).toBe('pending');
      expect(transfer.sourceChain).toBe('ethereum');
      expect(transfer.destinationChain).toBe('base');
      expect(transfer.sourceDomain).toBe(0);
      expect(transfer.destinationDomain).toBe(6);
      expect(transfer.destinationTxHash).toBeNull();
      expect(transfer.messageHash).toBeNull();
      expect(transfer.initiatedAt).toBeDefined();
    });

    it('should initiate a cross-chain transfer to Arc with correct domain', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(
        createTransferInput({ sourceChain: 'base', destinationChain: 'arc' }),
      );

      expect(transfer.id).toBeDefined();
      expect(transfer.status).toBe('pending');
      expect(transfer.sourceChain).toBe('base');
      expect(transfer.destinationChain).toBe('arc');
      expect(transfer.sourceDomain).toBe(6);
      expect(transfer.destinationDomain).toBe(10);
    });

    it('should record attestation for a pending transfer', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      const attested = manager.recordAttestation({
        transferId: transfer.id,
        messageHash: '0x' + 'b'.repeat(64),
      });

      expect(attested.status).toBe('attested');
      expect(attested.messageHash).toBe('0x' + 'b'.repeat(64));
      expect(attested.attestedAt).toBeDefined();
    });

    it('should confirm a transfer on destination chain', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      manager.recordAttestation({
        transferId: transfer.id,
        messageHash: '0x' + 'b'.repeat(64),
      });

      const confirmed = manager.confirmTransfer({
        transferId: transfer.id,
        destinationTxHash: '0x' + 'c'.repeat(64),
      });

      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.destinationTxHash).toBe('0x' + 'c'.repeat(64));
      expect(confirmed.confirmedAt).toBeDefined();
    });

    it('should reject attestation on non-pending transfer', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      manager.recordAttestation({
        transferId: transfer.id,
        messageHash: '0x' + 'b'.repeat(64),
      });

      expect(() =>
        manager.recordAttestation({
          transferId: transfer.id,
          messageHash: '0x' + 'd'.repeat(64),
        }),
      ).toThrow('not in pending status');
    });

    it('should reject confirmation on non-attested transfer', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      expect(() =>
        manager.confirmTransfer({
          transferId: transfer.id,
          destinationTxHash: '0x' + 'c'.repeat(64),
        }),
      ).toThrow('not in attested status');
    });

    it('should mark a transfer as failed', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      const failed = manager.failTransfer(transfer.id, 'Attestation timeout');

      expect(failed.status).toBe('failed');
      expect(failed.metadata['failureReason']).toBe('Attestation timeout');
    });

    it('should throw when accessing non-existent transfer', () => {
      const manager = new CCTPTransferManager();

      expect(() =>
        manager.recordAttestation({
          transferId: 'nonexistent',
          messageHash: '0x' + 'b'.repeat(64),
        }),
      ).toThrow('not found');
    });
  });

  describe('audit trail', () => {
    it('should link source and destination actions', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      manager.linkAction(transfer.id, 'action-source-123', 'source');
      manager.linkAction(transfer.id, 'action-dest-456', 'destination');

      const entry = manager.getAuditEntry(transfer.id);
      expect(entry).toBeDefined();
      expect(entry!.sourceActionId).toBe('action-source-123');
      expect(entry!.destinationActionId).toBe('action-dest-456');
      expect(entry!.linked).toBe(true);
    });

    it('should report unlinked when only one side is linked', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      manager.linkAction(transfer.id, 'action-source-123', 'source');

      const entry = manager.getAuditEntry(transfer.id);
      expect(entry!.linked).toBe(false);
    });

    it('should compute duration for confirmed transfers', () => {
      const manager = new CCTPTransferManager();
      const transfer = manager.initiateTransfer(createTransferInput());

      manager.recordAttestation({
        transferId: transfer.id,
        messageHash: '0x' + 'b'.repeat(64),
      });

      manager.confirmTransfer({
        transferId: transfer.id,
        destinationTxHash: '0x' + 'c'.repeat(64),
      });

      const entry = manager.getAuditEntry(transfer.id);
      expect(entry!.durationMs).toBeDefined();
      expect(entry!.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should build audit trail for all transfers', () => {
      const manager = new CCTPTransferManager();

      manager.initiateTransfer(createTransferInput({ agentId: 'agent-1' }));
      manager.initiateTransfer(createTransferInput({ agentId: 'agent-2' }));
      manager.initiateTransfer(createTransferInput({ agentId: 'agent-1' }));

      const allTrail = manager.getAuditTrail();
      expect(allTrail.length).toBe(3);

      const agent1Trail = manager.getAuditTrail('agent-1');
      expect(agent1Trail.length).toBe(2);
    });

    it('should throw when linking action to non-existent transfer', () => {
      const manager = new CCTPTransferManager();

      expect(() =>
        manager.linkAction('nonexistent', 'action-123', 'source'),
      ).toThrow('not found');
    });
  });

  describe('query methods', () => {
    it('should get transfers filtered by status', () => {
      const manager = new CCTPTransferManager();

      const t1 = manager.initiateTransfer(createTransferInput());
      const t2 = manager.initiateTransfer(createTransferInput());
      manager.recordAttestation({
        transferId: t1.id,
        messageHash: '0x' + 'b'.repeat(64),
      });

      const pending = manager.getTransfers('pending');
      expect(pending.length).toBe(1);

      const attested = manager.getTransfers('attested');
      expect(attested.length).toBe(1);
    });

    it('should get transfers by correlation ID', () => {
      const manager = new CCTPTransferManager();

      const t1 = manager.initiateTransfer(
        createTransferInput({ correlationId: 'corr-1' }),
      );
      const t2 = manager.initiateTransfer(
        createTransferInput({ correlationId: 'corr-1' }),
      );
      const t3 = manager.initiateTransfer(
        createTransferInput({ correlationId: 'corr-2' }),
      );

      const corr1 = manager.getTransfersByCorrelation('corr-1');
      expect(corr1.length).toBe(2);

      const corr2 = manager.getTransfersByCorrelation('corr-2');
      expect(corr2.length).toBe(1);
    });
  });

  describe('static helpers', () => {
    it('should return domain IDs for supported chains', () => {
      expect(CCTPTransferManager.getDomainId('ethereum')).toBe(0);
      expect(CCTPTransferManager.getDomainId('base')).toBe(6);
      expect(CCTPTransferManager.getDomainId('arbitrum')).toBe(3);
      expect(CCTPTransferManager.getDomainId('optimism')).toBe(2);
      expect(CCTPTransferManager.getDomainId('polygon')).toBe(7);
      expect(CCTPTransferManager.getDomainId('arc')).toBe(10);
    });

    it('should return supported chains', () => {
      const chains = CCTPTransferManager.getSupportedChains();
      expect(chains).toContain('ethereum');
      expect(chains).toContain('base');
      expect(chains).toContain('arc');
      expect(chains.length).toBeGreaterThanOrEqual(6);
    });
  });
});
