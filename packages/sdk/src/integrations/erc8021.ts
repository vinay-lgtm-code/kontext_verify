// ============================================================================
// Kontext SDK — ERC-8021 Transaction Attribution
// ============================================================================
// Encode and parse ERC-8021 data suffixes for on-chain transaction attribution.
// ERC-8021 appends builder codes to calldata; smart contracts ignore the extra
// data, while off-chain indexers parse it backward to extract attribution.
//
// Spec: https://www.erc8021.com/
// Suffix layout: [entity codes (ASCII, comma-delimited)][codesLength (1 byte)][schemaId (1 byte)][marker (16 bytes)]
// Marker: 0x80210000000000000000000000008021

import type { ERC8021Attribution } from '../types.js';

// ============================================================================
// Constants
// ============================================================================

/** 16-byte ERC-8021 marker (hex, no 0x prefix) */
const ERC_8021_MARKER = '80210000000000000000000000008021';

/** Default builder code for Kontext anchor transactions */
export const KONTEXT_BUILDER_CODE = 'kontext';

// ============================================================================
// Encode
// ============================================================================

/**
 * Encode an ERC-8021 data suffix for the given builder codes.
 * Returns hex string (no 0x prefix) to append directly to calldata.
 *
 * Layout: [codes (ASCII, comma-delimited)][codesLength (1 byte)][schemaId (1 byte)][marker (16 bytes)]
 */
export function encodeERC8021Suffix(codes: string[]): string {
  if (codes.length === 0) {
    throw new Error('ERC-8021: at least one builder code is required');
  }

  const codesStr = codes.join(',');
  // Convert ASCII string to hex
  let codesHex = '';
  for (let i = 0; i < codesStr.length; i++) {
    codesHex += codesStr.charCodeAt(i).toString(16).padStart(2, '0');
  }

  const codesLength = codesStr.length;
  if (codesLength > 255) {
    throw new Error('ERC-8021: combined codes length exceeds 255 bytes');
  }

  const codesLengthHex = codesLength.toString(16).padStart(2, '0');
  const schemaId = '00'; // Schema 0 = Canonical Code Registry

  return codesHex + codesLengthHex + schemaId + ERC_8021_MARKER;
}

// ============================================================================
// Parse
// ============================================================================

/**
 * Parse an ERC-8021 data suffix from calldata.
 * Returns null if the calldata does not contain a valid ERC-8021 suffix.
 * Parses backward from the end of calldata.
 */
export function parseERC8021Suffix(calldata: string): ERC8021Attribution | null {
  const clean = calldata.startsWith('0x') ? calldata.slice(2) : calldata;

  // Marker is the last 16 bytes (32 hex chars)
  if (clean.length < 36) return null; // minimum: 1 byte code + 1 byte length + 1 byte schema + 16 bytes marker

  const markerStart = clean.length - 32;
  const marker = clean.slice(markerStart);
  if (marker !== ERC_8021_MARKER) return null;

  // Schema ID is the byte before the marker
  const schemaId = parseInt(clean.slice(markerStart - 2, markerStart), 16);

  // Codes length is the byte before the schema ID
  const codesLength = parseInt(clean.slice(markerStart - 4, markerStart - 2), 16);
  if (isNaN(codesLength) || codesLength === 0) return null;

  // Codes are the bytes before the codes length
  const codesEnd = markerStart - 4;
  const codesStart = codesEnd - codesLength * 2;
  if (codesStart < 0) return null;

  const codesHex = clean.slice(codesStart, codesEnd);

  // Decode ASCII codes
  let codesStr = '';
  for (let i = 0; i < codesHex.length; i += 2) {
    codesStr += String.fromCharCode(parseInt(codesHex.slice(i, i + 2), 16));
  }

  const codes = codesStr.split(',').filter((c) => c.length > 0);
  if (codes.length === 0) return null;

  const rawSuffix = '0x' + clean.slice(codesStart);

  return { codes, schemaId, rawSuffix };
}

// ============================================================================
// RPC fetch
// ============================================================================

/**
 * Fetch a transaction's calldata and parse ERC-8021 attribution.
 * Uses eth_getTransactionByHash via JSON-RPC (zero dependencies).
 */
export async function fetchTransactionAttribution(
  rpcUrl: string,
  txHash: string,
): Promise<ERC8021Attribution | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionByHash',
        params: [txHash],
      }),
    });

    const json = (await res.json()) as {
      result?: { input?: string } | null;
      error?: { message: string };
    };

    if (json.error || !json.result?.input) return null;

    return parseERC8021Suffix(json.result.input);
  } catch {
    return null;
  }
}
