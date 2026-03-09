import type { DigestVerification, StoredReceipt } from './types.js';
import { sha256, stableStringify } from './utils.js';

export const GENESIS_HASH = '0'.repeat(64);

export interface DigestAppendResult {
  digest: string;
  priorDigest: string;
}

export class ReceiptDigestChain {
  private terminalDigest: string = GENESIS_HASH;
  private chainLength = 0;

  append(payload: Record<string, unknown>): DigestAppendResult {
    const priorDigest = this.terminalDigest;
    const digest = computeDigest(priorDigest, payload);

    this.terminalDigest = digest;
    this.chainLength += 1;

    return { digest, priorDigest };
  }

  getTerminalDigest(): string {
    return this.terminalDigest;
  }

  getChainLength(): number {
    return this.chainLength;
  }

  restore(terminalDigest: string, chainLength: number): void {
    this.terminalDigest = terminalDigest;
    this.chainLength = chainLength;
  }
}

export function computeDigest(priorDigest: string, payload: Record<string, unknown>): string {
  return sha256(`${priorDigest}:${stableStringify(payload)}`);
}

export function buildDigestPayload(receipt: StoredReceipt): Record<string, unknown> {
  return {
    receiptId: receipt.receiptId,
    decision: receipt.decision,
    checksRun: receipt.checksRun,
    violations: receipt.violations,
    requiredActions: receipt.requiredActions,
    chain: receipt.chain,
    token: receipt.token,
    amount: receipt.amount,
    from: receipt.from,
    to: receipt.to,
    actorId: receipt.actorId,
    metadata: receipt.metadata,
    createdAt: receipt.createdAt,
  };
}

export function verifyReceiptChain(receipts: StoredReceipt[]): DigestVerification {
  if (receipts.length === 0) {
    return {
      valid: true,
      linksVerified: 0,
      firstInvalidIndex: -1,
      terminalDigest: GENESIS_HASH,
    };
  }

  let prior = GENESIS_HASH;

  for (let i = 0; i < receipts.length; i += 1) {
    const receipt = receipts[i]!;
    const expected = computeDigest(prior, buildDigestPayload(receipt));

    if (receipt.priorDigest !== prior || receipt.digest !== expected) {
      return {
        valid: false,
        linksVerified: i,
        firstInvalidIndex: i,
        terminalDigest: prior,
      };
    }

    prior = receipt.digest;
  }

  return {
    valid: true,
    linksVerified: receipts.length,
    firstInvalidIndex: -1,
    terminalDigest: prior,
  };
}
