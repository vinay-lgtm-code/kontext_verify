// ============================================================================
// Kontext SDK — A2A Attestation Exchange
// ============================================================================
// Bilateral compliance attestation between agent pairs. Each agent proves
// to the other that it ran compliance checks by exchanging digest proofs.
// Zero dependencies — uses native fetch().

import type {
  AgentCard,
  CounterpartyConfig,
  AttestationRequest,
  AttestationResponse,
  CounterpartyAttestation,
} from './types.js';

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Fetch the counterparty's agent card from /.well-known/kontext.json
 */
export async function fetchAgentCard(
  endpoint: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<AgentCard> {
  const url = `${endpoint.replace(/\/$/, '')}/.well-known/kontext.json`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch agent card from ${url}: ${response.status}`);
  }
  return response.json() as Promise<AgentCard>;
}

/**
 * Exchange compliance attestation with a counterparty agent.
 *
 * Flow:
 * 1. Fetch counterparty's agent card from /.well-known/kontext.json
 * 2. Validate agent ID if specified
 * 3. Verify counterparty supports attestation
 * 4. POST attestation request to counterparty's attest endpoint
 * 5. Return counterparty's attestation response
 */
export async function exchangeAttestation(
  config: CounterpartyConfig,
  request: AttestationRequest,
): Promise<CounterpartyAttestation> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // 1. Fetch agent card
  const card = await fetchAgentCard(config.endpoint, timeoutMs);

  // 2. Validate agent ID if specified
  if (config.agentId && card.agentId !== config.agentId) {
    throw new Error(
      `Agent ID mismatch: expected ${config.agentId}, got ${card.agentId}`,
    );
  }

  // 3. Verify counterparty supports attestation
  if (!card.capabilities.includes('attest')) {
    throw new Error(
      `Counterparty ${card.agentId} does not support attestation`,
    );
  }

  // 4. Send attestation request
  const attestUrl = `${config.endpoint.replace(/\/$/, '')}${card.attestEndpoint}`;
  const response = await fetch(attestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Attestation request failed: ${response.status}`);
  }

  const result = (await response.json()) as AttestationResponse;

  return {
    attested: result.attested,
    digest: result.receiverDigest,
    agentId: result.receiverAgentId,
    timestamp: result.timestamp,
  };
}
