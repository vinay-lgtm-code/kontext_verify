// ============================================================================
// Kontext Server — Fact Verifier
// ============================================================================
// Extracts factual claims from generated narrative text and validates each
// against the original evidence bundle fields.

import type { EvidenceData } from './prompt-grounder.js';

export interface Claim {
  type: 'amount' | 'timestamp' | 'address' | 'status' | 'hash' | 'score';
  extracted: string;
  matched: boolean;
  field: string;
}

export interface VerificationResult {
  grounded: Claim[];
  ungrounded: string[];
}

export class FactVerifier {
  verify(narrativeText: string, evidence: EvidenceData): VerificationResult {
    const grounded: Claim[] = [];
    const ungrounded: string[] = [];

    this.verifyAmounts(narrativeText, evidence, grounded, ungrounded);
    this.verifyAddresses(narrativeText, evidence, grounded, ungrounded);
    this.verifyStatuses(narrativeText, evidence, grounded);
    this.verifyScores(narrativeText, evidence, grounded, ungrounded);

    return { grounded, ungrounded };
  }

  private verifyAmounts(
    text: string,
    evidence: EvidenceData,
    grounded: Claim[],
    ungrounded: string[],
  ): void {
    const amountPattern = /\$[\d,]+(?:\.\d{1,2})?/g;
    const matches = text.match(amountPattern) ?? [];

    const validAmounts = new Set([
      this.normalizeAmount(evidence.payment_amount),
      this.normalizeAmount(evidence.payment_usd_equivalent),
      // BSA regulatory thresholds are allowed as constants
      '3000', '3000.00',
      '10000', '10000.00',
      '50000', '50000.00',
    ]);

    for (const amt of matches) {
      const normalized = amt.replace(/[$,]/g, '');
      if (validAmounts.has(normalized)) {
        grounded.push({ type: 'amount', extracted: amt, matched: true, field: 'payment_amount' });
      } else {
        ungrounded.push(`Unverified amount: ${amt}`);
      }
    }
  }

  private verifyAddresses(
    text: string,
    evidence: EvidenceData,
    grounded: Claim[],
    ungrounded: string[],
  ): void {
    const addrPattern = /0x[a-fA-F0-9]{6,}/g;
    const matches = text.match(addrPattern) ?? [];

    const validHashes = new Set(
      [
        evidence.payment_from_address,
        evidence.payment_to_address,
        evidence.screened_entity,
        evidence.payment_tx_hash,
        evidence.exec_tx_hash,
        evidence.record_hash,
        evidence.previous_record_hash,
        evidence.intent_hash_value,
      ]
        .filter(Boolean)
        .map((v) => v!.toLowerCase()),
    );

    for (const addr of matches) {
      if (validHashes.has(addr.toLowerCase())) {
        grounded.push({ type: 'address', extracted: addr, matched: true, field: 'addresses' });
      } else {
        ungrounded.push(`Unverified address/hash: ${addr}`);
      }
    }
  }

  private verifyStatuses(
    text: string,
    evidence: EvidenceData,
    grounded: Claim[],
  ): void {
    const statusMap: Record<string, string[]> = {
      event_status: [evidence.status],
      ofac_status: [evidence.ofac_status],
      policy_decision: [evidence.policy_decision, evidence.policy_trace.decision],
      trust_band: [evidence.trust_band],
      screening_result: [evidence.screening_result],
      authorization_type: [evidence.authorization_type],
    };

    const lower = text.toLowerCase();
    for (const [field, values] of Object.entries(statusMap)) {
      for (const val of values) {
        if (val && lower.includes(val.toLowerCase())) {
          grounded.push({ type: 'status', extracted: val, matched: true, field });
        }
      }
    }
  }

  private verifyScores(
    text: string,
    evidence: EvidenceData,
    grounded: Claim[],
    ungrounded: string[],
  ): void {
    const scorePattern = /(?:trust\s*score|score)[:\s]*(\d{1,3})/gi;
    let match: RegExpExecArray | null;
    while ((match = scorePattern.exec(text)) !== null) {
      const val = match[1]!;
      if (parseInt(val, 10) === evidence.trust_score) {
        grounded.push({ type: 'score', extracted: val, matched: true, field: 'trust_score' });
      } else {
        ungrounded.push(`Unverified trust score: ${val} (expected ${evidence.trust_score})`);
      }
    }

    const chainPattern = /chain\s*index[:\s]*#?(\d+)/gi;
    let ciMatch: RegExpExecArray | null;
    while ((ciMatch = chainPattern.exec(text)) !== null) {
      const val = ciMatch[1]!;
      if (parseInt(val, 10) === evidence.chain_index) {
        grounded.push({ type: 'score', extracted: val, matched: true, field: 'chain_index' });
      } else {
        ungrounded.push(`Unverified chain index: ${val} (expected ${evidence.chain_index})`);
      }
    }
  }

  private normalizeAmount(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    // Return both integer and decimal forms for matching
    return num.toFixed(2);
  }
}
