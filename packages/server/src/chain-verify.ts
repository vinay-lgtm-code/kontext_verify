// ============================================================================
// Third-Party Chain Verification
// ============================================================================
// Allows external parties to verify the integrity of an exported digest chain
// without authentication. Accepts an array of chain entries and checks that
// each entry's previous_record_hash matches the prior entry's record_hash.

import { createHash } from 'crypto';

export interface ChainEntry {
  record_hash: string;
  previous_record_hash: string;
  chain_index: number;
}

export interface ChainVerificationResult {
  valid: boolean;
  chain_length: number;
  breaks: number[];
  attestation: string;
  verified_at: string;
}

/**
 * Verify the integrity of an exported digest chain.
 *
 * Sorts entries by chain_index ascending, then for each entry n (n >= 1)
 * checks that entries[n].previous_record_hash === entries[n-1].record_hash.
 * Produces a SHA-256 attestation of the verification result.
 */
export function verifyChainExport(entries: ChainEntry[]): ChainVerificationResult {
  const sorted = [...entries].sort((a, b) => a.chain_index - b.chain_index);

  const breaks: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.previous_record_hash !== sorted[i - 1]!.record_hash) {
      breaks.push(sorted[i]!.chain_index);
    }
  }

  const verified_at = new Date().toISOString();
  const resultPayload = {
    valid: breaks.length === 0,
    chain_length: sorted.length,
    breaks,
    verified_at,
  };

  const attestation = createHash('sha256')
    .update(JSON.stringify(resultPayload))
    .digest('hex');

  return { ...resultPayload, attestation };
}
