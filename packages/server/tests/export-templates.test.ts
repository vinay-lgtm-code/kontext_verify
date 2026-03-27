// ============================================================================
// Export Templates Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  EXPORT_TEMPLATES,
  getTemplate,
  TEMPLATE_NAMES,
  type EvidenceRow,
  type ExportTemplate,
} from '../src/export/templates.js';

// ---------------------------------------------------------------------------
// Fixture: minimal EvidenceRow
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<EvidenceRow> = {}): EvidenceRow {
  return {
    event_id: 'evt_001',
    org_id: 'org_001',
    environment: 'production',
    status: 'verified',
    created_at: '2026-01-15T12:00:00.000Z',
    verified_at: '2026-01-15T12:00:01.000Z',
    workflow: 'standard',
    agent_id: 'agent-treasury-v1',
    agent_type: 'autonomous',
    actor_type: 'agent',
    payment_tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    payment_chain: 'base',
    payment_rail: 'circle',
    payment_token: 'USDC',
    payment_amount: '5000.00',
    payment_currency: 'USD',
    payment_usd_equivalent: '5000.00',
    payment_from_address: '0x1111111111111111111111111111111111111111',
    payment_to_address: '0x2222222222222222222222222222222222222222',
    payment_destination_country: 'US',
    payment_counterparty_id: 'cp_001',
    intent_id: 'int_001',
    intent_type: 'payment',
    intent_declared_purpose: 'vendor-payment',
    intent_requested_by: 'agent-treasury-v1',
    intent_requested_at: '2026-01-15T11:59:00.000Z',
    policy_decision: 'allow',
    policy_version: 'v2.1',
    policy_violations: ['violation-1'],
    policy_warnings: ['warning-1'],
    applied_policy_ids: ['policy-bsa-v1'],
    ofac_status: 'clear',
    screened_at: '2026-01-15T11:59:30.000Z',
    screening_provider: 'kontext-ofac-v1',
    trust_score: 87,
    trust_band: 'high',
    trust_reasons: ['consistent-behavior', 'known-destination'],
    coverage_source: 'wallet-api',
    wallet_monitored: true,
    chain_listener_confirmed: true,
    coverage_status: 'active',
    evidence_bundle_id: 'eb_001',
    team_tag: 'treasury',
    business_unit_tag: 'finance',
    intent_hash_algorithm: 'sha256',
    intent_hash_value: '0xdeadbeef12345678',
    intent_hash_canonical_fields: ['amount', 'to', 'from'],
    authorization_type: 'automatic',
    authorized: true,
    authorizer: 'system',
    authorization_scope: 'full',
    evaluated_at: '2026-01-15T12:00:00.500Z',
    policy_trace: { decision: 'allow', rules_evaluated: 5 },
    eb_screening_provider: 'kontext-ofac-v1',
    screening_result: 'clean',
    screened_entity: '0x2222222222222222222222222222222222222222',
    screening_screened_at: '2026-01-15T11:59:00.000Z',
    exec_tx_hash: '0xexechash1234567890abcdef',
    exec_chain: 'base',
    exec_observed_onchain: true,
    exec_first_seen_at: '2026-01-15T12:00:02.000Z',
    exec_confirmation_status: 'confirmed',
    record_hash: '0xrecordhash_aabbccdd',
    previous_record_hash: '0xprevhash_11223344',
    chain_index: 42,
    render_headline: 'Transfer Verified',
    render_subheadline: 'All checks passed',
    render_risk_label: 'low',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Export Templates', () => {
  const ALL_NAMES = ['examiner', 'diligence', 'incident', 'redacted'];

  // --- All 4 templates exist ---

  it('EXPORT_TEMPLATES contains exactly 4 templates', () => {
    expect(Object.keys(EXPORT_TEMPLATES)).toHaveLength(4);
  });

  it('TEMPLATE_NAMES contains all 4 template names', () => {
    for (const name of ALL_NAMES) {
      expect(TEMPLATE_NAMES).toContain(name);
    }
  });

  it.each(ALL_NAMES)('getTemplate("%s") returns the template', (name) => {
    const tmpl = getTemplate(name);
    expect(tmpl).toBeDefined();
    expect(tmpl!.name).toBe(name);
  });

  it('getTemplate returns undefined for unknown name', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  // --- Each template has name, description, columns ---

  it.each(ALL_NAMES)('template "%s" has name, description, and columns array', (name) => {
    const tmpl = getTemplate(name)!;

    expect(typeof tmpl.name).toBe('string');
    expect(tmpl.name.length).toBeGreaterThan(0);
    expect(typeof tmpl.description).toBe('string');
    expect(tmpl.description.length).toBeGreaterThan(0);
    expect(Array.isArray(tmpl.columns)).toBe(true);
    expect(tmpl.columns.length).toBeGreaterThan(0);
  });

  // --- transformRow returns Record with expected keys ---

  it.each(ALL_NAMES)('template "%s" transformRow returns keys matching columns', (name) => {
    const tmpl = getTemplate(name)!;
    const row = makeRow();
    const result = tmpl.transformRow(row);

    expect(typeof result).toBe('object');
    for (const col of tmpl.columns) {
      expect(col in result).toBe(true);
    }
  });

  // --- Examiner template: full evidence ---

  describe('examiner template', () => {
    it('includes all core evidence fields', () => {
      const tmpl = getTemplate('examiner')!;
      const coreFields = [
        'event_id', 'status', 'agent_id', 'payment_amount',
        'ofac_status', 'trust_score', 'record_hash', 'chain_index',
        'payment_from_address', 'payment_to_address',
      ];
      for (const field of coreFields) {
        expect(tmpl.columns).toContain(field);
      }
    });

    it('transforms row preserving raw values', () => {
      const tmpl = getTemplate('examiner')!;
      const row = makeRow();
      const result = tmpl.transformRow(row);

      expect(result['event_id']).toBe('evt_001');
      expect(result['payment_amount']).toBe('5000.00');
      expect(result['trust_score']).toBe(87);
      expect(result['chain_index']).toBe(42);
    });

    it('joins array fields with semicolons', () => {
      const tmpl = getTemplate('examiner')!;
      const row = makeRow({
        policy_violations: ['v1', 'v2'],
        policy_warnings: ['w1', 'w2'],
        trust_reasons: ['r1', 'r2'],
      });
      const result = tmpl.transformRow(row);

      expect(result['policy_violations']).toBe('v1; v2');
      expect(result['policy_warnings']).toBe('w1; w2');
      expect(result['trust_reasons']).toBe('r1; r2');
    });

    it('stringifies policy_trace as JSON', () => {
      const tmpl = getTemplate('examiner')!;
      const row = makeRow();
      const result = tmpl.transformRow(row);

      expect(typeof result['policy_trace']).toBe('string');
      expect(JSON.parse(result['policy_trace'] as string)).toEqual(row.policy_trace);
    });
  });

  // --- Redacted template ---

  describe('redacted template', () => {
    it('truncates addresses (first 6 + last 4 chars)', () => {
      const tmpl = getTemplate('redacted')!;
      const row = makeRow({
        payment_from_address: '0x1111111111111111111111111111111111111111',
        payment_to_address: '0x2222222222222222222222222222222222222222',
      });
      const result = tmpl.transformRow(row);

      expect(result['payment_from_address']).toBe('0x1111...1111');
      expect(result['payment_to_address']).toBe('0x2222...2222');
    });

    it('hashes agent IDs (not raw)', () => {
      const tmpl = getTemplate('redacted')!;
      const row = makeRow({ agent_id: 'agent-treasury-v1' });
      const result = tmpl.transformRow(row);

      expect(result['agent_id_hash']).not.toBe('agent-treasury-v1');
      expect(typeof result['agent_id_hash']).toBe('string');
      expect((result['agent_id_hash'] as string).startsWith('agent_')).toBe(true);
    });

    it('hashed agent ID is deterministic', () => {
      const tmpl = getTemplate('redacted')!;
      const row1 = makeRow({ agent_id: 'agent-treasury-v1' });
      const row2 = makeRow({ agent_id: 'agent-treasury-v1' });
      const r1 = tmpl.transformRow(row1);
      const r2 = tmpl.transformRow(row2);

      expect(r1['agent_id_hash']).toBe(r2['agent_id_hash']);
    });

    it('different agent IDs produce different hashes', () => {
      const tmpl = getTemplate('redacted')!;
      const r1 = tmpl.transformRow(makeRow({ agent_id: 'agent-a' }));
      const r2 = tmpl.transformRow(makeRow({ agent_id: 'agent-b' }));

      expect(r1['agent_id_hash']).not.toBe(r2['agent_id_hash']);
    });

    it('does not include raw agent_id column', () => {
      const tmpl = getTemplate('redacted')!;
      expect(tmpl.columns).not.toContain('agent_id');
      expect(tmpl.columns).toContain('agent_id_hash');
    });

    it('short address (<=10 chars) is not truncated', () => {
      const tmpl = getTemplate('redacted')!;
      const row = makeRow({ payment_from_address: '0xABCDEF' });
      const result = tmpl.transformRow(row);

      // 8 chars total <= 10, returned as-is
      expect(result['payment_from_address']).toBe('0xABCDEF');
    });
  });

  // --- Null/undefined fields ---

  describe('null/undefined field handling', () => {
    it('examiner template handles null fields gracefully', () => {
      const tmpl = getTemplate('examiner')!;
      const row = makeRow({
        payment_tx_hash: null,
        verified_at: null,
        agent_type: null,
        payment_destination_country: null,
        payment_counterparty_id: null,
        exec_tx_hash: null,
        screening_provider: null,
      });
      const result = tmpl.transformRow(row);

      expect(result['payment_tx_hash']).toBeNull();
      expect(result['verified_at']).toBeNull();
      expect(result['agent_type']).toBeNull();
    });

    it('examiner template falls back to eb_screening_provider when screening_provider is null', () => {
      const tmpl = getTemplate('examiner')!;
      const row = makeRow({
        screening_provider: null,
        eb_screening_provider: 'fallback-provider',
      });
      const result = tmpl.transformRow(row);

      expect(result['screening_provider']).toBe('fallback-provider');
    });

    it('diligence template falls back to eb_screening_provider', () => {
      const tmpl = getTemplate('diligence')!;
      const row = makeRow({
        screening_provider: null,
        eb_screening_provider: 'fallback-diligence',
      });
      const result = tmpl.transformRow(row);

      expect(result['screening_provider']).toBe('fallback-diligence');
    });

    it('redacted template handles null payment_from_address', () => {
      const tmpl = getTemplate('redacted')!;
      const row = makeRow({ payment_from_address: null as any });
      const result = tmpl.transformRow(row);

      expect(result['payment_from_address']).toBe('');
    });

    it('incident template handles empty arrays gracefully', () => {
      const tmpl = getTemplate('incident')!;
      const row = makeRow({
        policy_violations: [],
        policy_warnings: [],
        trust_reasons: [],
      });
      const result = tmpl.transformRow(row);

      expect(result['policy_violations']).toBe('');
      expect(result['policy_warnings']).toBe('');
      expect(result['trust_reasons']).toBe('');
    });
  });

  // --- Diligence template ---

  describe('diligence template', () => {
    it('has a subset of columns compared to examiner', () => {
      const examiner = getTemplate('examiner')!;
      const diligence = getTemplate('diligence')!;

      expect(diligence.columns.length).toBeLessThan(examiner.columns.length);
    });

    it('includes core payment and screening fields', () => {
      const tmpl = getTemplate('diligence')!;
      expect(tmpl.columns).toContain('payment_amount');
      expect(tmpl.columns).toContain('ofac_status');
      expect(tmpl.columns).toContain('policy_decision');
      expect(tmpl.columns).toContain('trust_score');
    });
  });

  // --- Incident template ---

  describe('incident template', () => {
    it('includes render_headline and render_risk_label', () => {
      const tmpl = getTemplate('incident')!;
      expect(tmpl.columns).toContain('render_headline');
      expect(tmpl.columns).toContain('render_risk_label');
    });

    it('includes trust_reasons for investigation', () => {
      const tmpl = getTemplate('incident')!;
      expect(tmpl.columns).toContain('trust_reasons');
    });
  });
});
