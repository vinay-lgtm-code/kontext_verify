import { describe, it, expect } from 'vitest';
import { DigestChain, verifyExportedChain } from '../src/digest.js';
import type { ActionLog } from '../src/types.js';

function makeAction(id: string, type: string): ActionLog {
  return {
    id,
    timestamp: new Date().toISOString(),
    projectId: 'test-project',
    agentId: 'agent-1',
    correlationId: 'corr-1',
    type,
    description: `Test action ${id}`,
    metadata: {},
  };
}

describe('DigestChain', () => {
  it('should produce a digest for the first action', () => {
    const chain = new DigestChain();
    const action = makeAction('a1', 'transfer');
    const link = chain.append(action);

    expect(link.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(link.priorDigest).toBe('0'.repeat(64)); // genesis
    expect(link.sequence).toBe(0);
    expect(link.actionId).toBe('a1');
  });

  it('should chain digests — each link references the prior', () => {
    const chain = new DigestChain();
    const a1 = makeAction('a1', 'transfer');
    const a2 = makeAction('a2', 'approval');
    const a3 = makeAction('a3', 'query');

    const l1 = chain.append(a1);
    const l2 = chain.append(a2);
    const l3 = chain.append(a3);

    expect(l2.priorDigest).toBe(l1.digest);
    expect(l3.priorDigest).toBe(l2.digest);
    expect(l1.digest).not.toBe(l2.digest);
    expect(l2.digest).not.toBe(l3.digest);
  });

  it('should track the terminal digest', () => {
    const chain = new DigestChain();
    expect(chain.getTerminalDigest()).toBe('0'.repeat(64));

    const a1 = makeAction('a1', 'transfer');
    const l1 = chain.append(a1);
    expect(chain.getTerminalDigest()).toBe(l1.digest);

    const a2 = makeAction('a2', 'approval');
    const l2 = chain.append(a2);
    expect(chain.getTerminalDigest()).toBe(l2.digest);
  });

  it('should verify a valid chain', () => {
    const chain = new DigestChain();
    const actions = [
      makeAction('a1', 'transfer'),
      makeAction('a2', 'approval'),
      makeAction('a3', 'query'),
    ];

    for (const action of actions) {
      chain.append(action);
    }

    const result = chain.verify(actions);
    expect(result.valid).toBe(true);
    expect(result.linksVerified).toBe(3);
    expect(result.firstInvalidIndex).toBe(-1);
    expect(result.verificationTimeMs).toBeLessThan(100);
  });

  it('should detect tampering — modified action', () => {
    const chain = new DigestChain();
    const actions = [
      makeAction('a1', 'transfer'),
      makeAction('a2', 'approval'),
      makeAction('a3', 'query'),
    ];

    for (const action of actions) {
      chain.append(action);
    }

    // Tamper with the second action
    const tamperedActions = [...actions];
    tamperedActions[1] = { ...tamperedActions[1]!, description: 'TAMPERED' };

    const result = chain.verify(tamperedActions);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(1);
  });

  it('should detect tampering — missing action', () => {
    const chain = new DigestChain();
    const actions = [
      makeAction('a1', 'transfer'),
      makeAction('a2', 'approval'),
    ];

    for (const action of actions) {
      chain.append(action);
    }

    // Only pass one action
    const result = chain.verify([actions[0]!]);
    expect(result.valid).toBe(false);
  });

  it('should detect tampering — reordered actions', () => {
    const chain = new DigestChain();
    const actions = [
      makeAction('a1', 'transfer'),
      makeAction('a2', 'approval'),
    ];

    for (const action of actions) {
      chain.append(action);
    }

    // Reverse order
    const result = chain.verify([actions[1]!, actions[0]!]);
    expect(result.valid).toBe(false);
  });

  it('should export and independently verify chain', () => {
    const chain = new DigestChain();
    const actions = [
      makeAction('a1', 'transfer'),
      makeAction('a2', 'approval'),
      makeAction('a3', 'query'),
    ];

    for (const action of actions) {
      chain.append(action);
    }

    const exported = chain.exportChain();
    expect(exported.genesisHash).toBe('0'.repeat(64));
    expect(exported.links).toHaveLength(3);
    expect(exported.terminalDigest).toBe(chain.getTerminalDigest());

    // Independent verification (simulates third-party)
    const result = verifyExportedChain(exported, actions);
    expect(result.valid).toBe(true);
    expect(result.linksVerified).toBe(3);
  });

  it('should fail independent verification with tampered data', () => {
    const chain = new DigestChain();
    const actions = [
      makeAction('a1', 'transfer'),
      makeAction('a2', 'approval'),
    ];

    for (const action of actions) {
      chain.append(action);
    }

    const exported = chain.exportChain();
    const tamperedActions = [actions[0]!, { ...actions[1]!, type: 'TAMPERED' }];

    const result = verifyExportedChain(exported, tamperedActions);
    expect(result.valid).toBe(false);
  });

  it('should produce unique salts from timestamps', () => {
    const chain = new DigestChain();
    const a1 = makeAction('a1', 'transfer');
    const a2 = makeAction('a2', 'transfer');

    const l1 = chain.append(a1);
    const l2 = chain.append(a2);

    // Salts should differ (derived from different hrtime values)
    expect(l1.salt).not.toBe(l2.salt);
  });

  it('should verify individual links', () => {
    const chain = new DigestChain();
    const a1 = makeAction('a1', 'transfer');
    const a2 = makeAction('a2', 'approval');

    const l1 = chain.append(a1);
    const l2 = chain.append(a2);

    expect(chain.verifyLink(l1, a1, '0'.repeat(64))).toBe(true);
    expect(chain.verifyLink(l2, a2, l1.digest)).toBe(true);
    expect(chain.verifyLink(l2, a2, '0'.repeat(64))).toBe(false); // wrong prior
  });

  it('should handle large chains efficiently', () => {
    const chain = new DigestChain();
    const actions: ActionLog[] = [];

    // Chain 1000 actions
    for (let i = 0; i < 1000; i++) {
      const action = makeAction(`a${i}`, 'transfer');
      chain.append(action);
      actions.push(action);
    }

    expect(chain.getChainLength()).toBe(1000);

    // Verify should complete in <100ms
    const result = chain.verify(actions);
    expect(result.valid).toBe(true);
    expect(result.linksVerified).toBe(1000);
    expect(result.verificationTimeMs).toBeLessThan(100);
  });
});
