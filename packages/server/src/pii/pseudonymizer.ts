// ============================================================================
// Kontext Server — PII Pseudonymizer
// ============================================================================
// Replaces raw PII fields (from_address, to_address) with pseudonym tokens
// from the PII vault. Used at ingestion time so the digest chain computes
// record_hash on pseudonymized values — chain stays verifiable after erasure.

import type { Pool } from 'pg';
import type { PIIVault } from './vault.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PseudonymizablePayment {
  from_address: string;
  to_address: string;
  [key: string]: unknown;
}

export interface PseudonymizeResult {
  /** The payment object with addresses replaced by pseudonym tokens */
  payment: PseudonymizablePayment;
  /** Map of original address -> pseudonym token (for audit) */
  mappings: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Pseudonymizer class
// ---------------------------------------------------------------------------

export class Pseudonymizer {
  /**
   * Detect PII fields (from_address, to_address) and replace them with
   * pseudonym tokens from the vault. Each unique address is stored once.
   */
  async pseudonymize(
    data: PseudonymizablePayment,
    vault: PIIVault,
    pool: Pool,
    orgId: string,
  ): Promise<PseudonymizeResult> {
    const mappings: Record<string, string> = {};
    const result = { ...data };

    // Normalize addresses to lowercase for consistent deduplication
    const fromAddr = data.from_address.toLowerCase();
    const toAddr = data.to_address.toLowerCase();

    // Collect unique addresses
    const uniqueAddresses = new Set([fromAddr, toAddr]);

    // Store each unique address and get its pseudonym token
    for (const address of uniqueAddresses) {
      const token = await vault.store(pool, orgId, address, 'individual', {
        address,
        type: 'wallet_address',
      });
      mappings[address] = token;
    }

    // Replace addresses with pseudonym tokens
    const fromToken = mappings[fromAddr];
    const toToken = mappings[toAddr];
    if (fromToken) result.from_address = fromToken;
    if (toToken) result.to_address = toToken;

    return { payment: result, mappings };
  }

  /**
   * Reverse lookup: replace pseudonym tokens in data with original values
   * from the vault. Used for GDPR Subject Access Requests.
   */
  async resolve(
    data: PseudonymizablePayment,
    vault: PIIVault,
    pool: Pool,
  ): Promise<PseudonymizablePayment> {
    const result = { ...data };

    // Check if from_address is a pseudonym token
    if (data.from_address.startsWith('pii_')) {
      const resolved = await vault.resolve(pool, data.from_address);
      if (resolved && typeof resolved['address'] === 'string') {
        result.from_address = resolved['address'];
      }
    }

    // Check if to_address is a pseudonym token
    if (data.to_address.startsWith('pii_')) {
      const resolved = await vault.resolve(pool, data.to_address);
      if (resolved && typeof resolved['address'] === 'string') {
        result.to_address = resolved['address'];
      }
    }

    return result;
  }
}
