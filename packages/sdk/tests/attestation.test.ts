import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAgentCard, exchangeAttestation } from '../src/attestation.js';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MOCK_AGENT_CARD = {
  agentId: 'receiver-agent',
  kontextVersion: '0.5.0',
  capabilities: ['attest', 'verify'],
  attestEndpoint: '/api/kontext/attest',
};

const MOCK_ATTESTATION_RESPONSE = {
  attested: true,
  receiverDigest: '0x' + 'bb'.repeat(32),
  receiverAgentId: 'receiver-agent',
  timestamp: '2026-02-27T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// fetchAgentCard()
// ---------------------------------------------------------------------------

describe('fetchAgentCard()', () => {
  it('should fetch agent card from /.well-known/kontext.json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_AGENT_CARD,
    });

    const card = await fetchAgentCard('https://agent-b.app');

    expect(card.agentId).toBe('receiver-agent');
    expect(card.capabilities).toContain('attest');
    expect(card.attestEndpoint).toBe('/api/kontext/attest');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://agent-b.app/.well-known/kontext.json',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('should strip trailing slash from endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_AGENT_CARD,
    });

    await fetchAgentCard('https://agent-b.app/');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://agent-b.app/.well-known/kontext.json',
      expect.anything(),
    );
  });

  it('should throw on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(
      fetchAgentCard('https://agent-b.app'),
    ).rejects.toThrow(/Failed to fetch agent card/);
  });
});

// ---------------------------------------------------------------------------
// exchangeAttestation()
// ---------------------------------------------------------------------------

describe('exchangeAttestation()', () => {
  it('should complete full attestation exchange', async () => {
    // First call: fetch agent card
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_AGENT_CARD,
    });

    // Second call: POST attestation request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ATTESTATION_RESPONSE,
    });

    const result = await exchangeAttestation(
      { endpoint: 'https://agent-b.app' },
      {
        senderDigest: '0x' + 'aa'.repeat(32),
        senderAgentId: 'sender-agent',
        amount: '5000',
        timestamp: new Date().toISOString(),
      },
    );

    expect(result.attested).toBe(true);
    expect(result.digest).toBe(MOCK_ATTESTATION_RESPONSE.receiverDigest);
    expect(result.agentId).toBe('receiver-agent');
    expect(result.timestamp).toBe(MOCK_ATTESTATION_RESPONSE.timestamp);

    // Verify POST was made to correct URL
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const postCall = mockFetch.mock.calls[1]!;
    expect(postCall[0]).toBe('https://agent-b.app/api/kontext/attest');
    expect(postCall[1].method).toBe('POST');
  });

  it('should throw on agent ID mismatch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_AGENT_CARD,
    });

    await expect(
      exchangeAttestation(
        { endpoint: 'https://agent-b.app', agentId: 'wrong-agent' },
        {
          senderDigest: '0x' + 'aa'.repeat(32),
          senderAgentId: 'sender-agent',
          amount: '5000',
          timestamp: new Date().toISOString(),
        },
      ),
    ).rejects.toThrow(/Agent ID mismatch/);
  });

  it('should throw when counterparty does not support attestation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...MOCK_AGENT_CARD,
        capabilities: ['verify'],  // no 'attest'
      }),
    });

    await expect(
      exchangeAttestation(
        { endpoint: 'https://agent-b.app' },
        {
          senderDigest: '0x' + 'aa'.repeat(32),
          senderAgentId: 'sender-agent',
          amount: '5000',
          timestamp: new Date().toISOString(),
        },
      ),
    ).rejects.toThrow(/does not support attestation/);
  });

  it('should throw on attestation POST failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_AGENT_CARD,
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      exchangeAttestation(
        { endpoint: 'https://agent-b.app' },
        {
          senderDigest: '0x' + 'aa'.repeat(32),
          senderAgentId: 'sender-agent',
          amount: '5000',
          timestamp: new Date().toISOString(),
        },
      ),
    ).rejects.toThrow(/Attestation request failed/);
  });
});
