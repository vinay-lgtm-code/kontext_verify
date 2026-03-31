// ============================================================================
// Prompt Grounder Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import { PromptGrounder } from '../src/narrator/prompt-grounder.js';
import type { EvidenceData } from '../src/narrator/prompt-grounder.js';
import type { NarrativeTemplate } from '../src/narrator/template-builder.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEvidence(overrides: Partial<EvidenceData> = {}): EvidenceData {
  return {
    event_id: 'evt_001',
    status: 'verified',
    workflow: 'standard',
    agent_id: 'agent-treasury-v1',
    agent_type: 'autonomous',
    actor_type: 'agent',
    payment_tx_hash: '0xabcdef1234567890',
    payment_chain: 'base',
    payment_rail: 'circle',
    payment_token: 'USDC',
    payment_amount: '5000.00',
    payment_currency: 'USD',
    payment_usd_equivalent: '5000.00',
    payment_from_address: '0x1111111111111111',
    payment_to_address: '0x2222222222222222',
    payment_destination_country: 'US',
    policy_decision: 'allow',
    policy_violations: ['violation-1'],
    policy_warnings: ['warning-1'],
    applied_policy_ids: ['policy-bsa-v1'],
    ofac_status: 'clear',
    screening_provider: 'kontext-ofac-v1',
    trust_score: 87,
    trust_band: 'high',
    trust_reasons: ['consistent-behavior'],
    created_at: '2026-01-15T12:00:00.000Z',
    evidence_bundle_id: 'eb_001',
    intent_hash_algorithm: 'sha256',
    intent_hash_value: '0xdeadbeef',
    authorization_type: 'automatic',
    authorized: true,
    authorizer: 'system',
    policy_trace: {
      decision: 'allow',
      rules_evaluated: 5,
      passed_rules: ['ofac-check'],
      failed_rules: [],
      warning_rules: ['edd-threshold'],
    },
    screening_result: 'clean',
    screened_entity: '0x2222222222222222',
    screening_screened_at: '2026-01-15T11:59:00.000Z',
    exec_tx_hash: '0xexechash1234',
    exec_chain: 'base',
    exec_observed_onchain: true,
    record_hash: '0xrecordhash',
    previous_record_hash: '0xprevhash',
    chain_index: 42,
    render_headline: 'Transfer Verified',
    render_subheadline: 'All checks passed',
    render_risk_label: 'low',
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<NarrativeTemplate> = {}): NarrativeTemplate {
  return {
    name: 'occ',
    displayName: 'OCC Examination Narrative',
    systemPrompt: 'You are a compliance analyst preparing a narrative for OCC bank examiners.',
    requiredSections: [
      'transaction_summary',
      'sanctions_screening',
      'policy_evaluation',
      'trust_assessment',
      'tamper_evidence',
    ],
    sectionEmphasis: {
      transaction_summary: 'Include BSA threshold analysis.',
      sanctions_screening: 'Detail OFAC SDN screening.',
      policy_evaluation: 'Map to OCC standards.',
      trust_assessment: 'Explain trust score factors.',
      tamper_evidence: 'Describe digest chain integrity.',
    },
    ...overrides,
  };
}

describe('PromptGrounder', () => {
  const grounder = new PromptGrounder();

  // --- System prompt ---

  it('system prompt includes the template role description', () => {
    const template = makeTemplate({
      systemPrompt: 'You are a compliance analyst for OCC.',
    });
    const result = grounder.buildPrompt(makeEvidence(), template);

    expect(result.systemPrompt).toContain('You are a compliance analyst for OCC.');
  });

  it('system prompt includes hard constraint about not fabricating data', () => {
    const result = grounder.buildPrompt(makeEvidence(), makeTemplate());

    expect(result.systemPrompt).toContain('HARD CONSTRAINT');
    expect(result.systemPrompt).toContain('MUST NOT include any information not present');
  });

  it('system prompt includes instruction about null/empty fields', () => {
    const result = grounder.buildPrompt(makeEvidence(), makeTemplate());

    expect(result.systemPrompt).toContain('null or empty');
    expect(result.systemPrompt).toContain('not available');
  });

  // --- User prompt content ---

  it('user prompt contains evidence field values', () => {
    const evidence = makeEvidence({
      event_id: 'evt_test_123',
      payment_amount: '25000.00',
      agent_id: 'agent-special',
      ofac_status: 'clear',
      trust_score: 92,
    });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('evt_test_123');
    expect(result.userPrompt).toContain('25000.00');
    expect(result.userPrompt).toContain('agent-special');
    expect(result.userPrompt).toContain('clear');
    expect(result.userPrompt).toContain('92');
  });

  it('user prompt contains all major evidence sections', () => {
    const result = grounder.buildPrompt(makeEvidence(), makeTemplate());

    expect(result.userPrompt).toContain('### Agent');
    expect(result.userPrompt).toContain('### Payment');
    expect(result.userPrompt).toContain('### Sanctions Screening');
    expect(result.userPrompt).toContain('### Policy Evaluation');
    expect(result.userPrompt).toContain('### Trust Assessment');
    expect(result.userPrompt).toContain('### Authorization');
    expect(result.userPrompt).toContain('### Cryptographic Proof');
  });

  it('user prompt contains EVIDENCE DATA marker', () => {
    const result = grounder.buildPrompt(makeEvidence(), makeTemplate());

    expect(result.userPrompt).toContain('--- EVIDENCE DATA ---');
  });

  it('user prompt contains SECTION INSTRUCTIONS marker', () => {
    const result = grounder.buildPrompt(makeEvidence(), makeTemplate());

    expect(result.userPrompt).toContain('--- SECTION INSTRUCTIONS ---');
  });

  // --- Template sections ---

  it('template sections appear in correct order in user prompt', () => {
    const template = makeTemplate();
    const result = grounder.buildPrompt(makeEvidence(), template);

    const sections = template.requiredSections;
    const positions = sections.map((s) => result.userPrompt.indexOf(`## ${s}`));

    // Every section should appear
    for (const pos of positions) {
      expect(pos).toBeGreaterThan(-1);
    }

    // And in order
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]!);
    }
  });

  it('section emphasis text is included for each section', () => {
    const template = makeTemplate({
      sectionEmphasis: {
        transaction_summary: 'CUSTOM_EMPHASIS_TX_SUMMARY',
        sanctions_screening: 'CUSTOM_EMPHASIS_SANCTIONS',
      },
    });
    const result = grounder.buildPrompt(makeEvidence(), template);

    expect(result.userPrompt).toContain('CUSTOM_EMPHASIS_TX_SUMMARY');
    expect(result.userPrompt).toContain('CUSTOM_EMPHASIS_SANCTIONS');
  });

  // --- Null/undefined evidence fields ---

  it('handles null agent_type gracefully (renders N/A)', () => {
    const evidence = makeEvidence({ agent_type: null });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('Agent Type: N/A');
  });

  it('handles null payment_tx_hash gracefully (renders N/A)', () => {
    const evidence = makeEvidence({ payment_tx_hash: null });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('Transaction Hash: N/A');
  });

  it('handles null payment_destination_country gracefully', () => {
    const evidence = makeEvidence({ payment_destination_country: null });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('Destination Country: N/A');
  });

  it('handles null exec_tx_hash gracefully', () => {
    const evidence = makeEvidence({ exec_tx_hash: null });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('Execution TX Hash: N/A');
  });

  it('handles null screening_provider gracefully', () => {
    const evidence = makeEvidence({ screening_provider: null });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('Screening Provider: kontext-ofac-v1');
  });

  it('handles empty arrays gracefully (renders "none")', () => {
    const evidence = makeEvidence({
      policy_violations: [],
      policy_warnings: [],
      applied_policy_ids: [],
      trust_reasons: [],
      policy_trace: {
        decision: 'allow',
        rules_evaluated: 0,
        passed_rules: [],
        failed_rules: [],
        warning_rules: [],
      },
    });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('Violations: none');
    expect(result.userPrompt).toContain('Warnings: none');
    expect(result.userPrompt).toContain('Trust Reasons: none');
  });

  // --- Special characters ---

  it('special characters in evidence do not break prompt', () => {
    const evidence = makeEvidence({
      agent_id: 'agent-with-"quotes"-and-$pecial',
      payment_chain: 'base<script>alert("xss")</script>',
    });
    const result = grounder.buildPrompt(evidence, makeTemplate());

    expect(result.userPrompt).toContain('agent-with-"quotes"-and-$pecial');
    expect(result.userPrompt).toContain('base<script>alert("xss")</script>');
  });

  // --- All fields populated ---

  it('builds prompt with all evidence fields populated', () => {
    const evidence = makeEvidence();
    const result = grounder.buildPrompt(evidence, makeTemplate());

    // Check key fields from each section
    expect(result.userPrompt).toContain(evidence.event_id);
    expect(result.userPrompt).toContain(evidence.agent_id);
    expect(result.userPrompt).toContain(evidence.payment_amount);
    expect(result.userPrompt).toContain(evidence.ofac_status);
    expect(result.userPrompt).toContain(String(evidence.trust_score));
    expect(result.userPrompt).toContain(evidence.authorization_type);
    expect(result.userPrompt).toContain(evidence.record_hash);
    expect(result.userPrompt).toContain(String(evidence.chain_index));
  });

  // --- Return type ---

  it('returns object with systemPrompt and userPrompt strings', () => {
    const result = grounder.buildPrompt(makeEvidence(), makeTemplate());

    expect(typeof result.systemPrompt).toBe('string');
    expect(typeof result.userPrompt).toBe('string');
    expect(result.systemPrompt.length).toBeGreaterThan(0);
    expect(result.userPrompt.length).toBeGreaterThan(0);
  });
});
