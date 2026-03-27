// ============================================================================
// Kontext Server — Prompt Grounder
// ============================================================================
// Maps evidence bundle fields to prompt context variables. Ensures the LLM
// receives only factual data from the evidence record.

import type { NarrativeTemplate } from './template-builder.js';

/** Evidence data passed to the grounder (subset of verification_events + evidence_bundles). */
export interface EvidenceData {
  // From verification_events
  event_id: string;
  status: string;
  workflow: string;
  agent_id: string;
  agent_type: string | null;
  actor_type: string;
  payment_tx_hash: string | null;
  payment_chain: string;
  payment_rail: string;
  payment_token: string;
  payment_amount: string;
  payment_currency: string;
  payment_usd_equivalent: string;
  payment_from_address: string;
  payment_to_address: string;
  payment_destination_country: string | null;
  policy_decision: string;
  policy_violations: string[];
  policy_warnings: string[];
  applied_policy_ids: string[];
  ofac_status: string;
  screening_provider: string | null;
  trust_score: number;
  trust_band: string;
  trust_reasons: string[];
  created_at: string;
  // From evidence_bundles
  evidence_bundle_id: string;
  intent_hash_algorithm: string;
  intent_hash_value: string;
  authorization_type: string;
  authorized: boolean;
  authorizer: string;
  policy_trace: {
    decision: string;
    rules_evaluated: number;
    passed_rules: string[];
    failed_rules: string[];
    warning_rules: string[];
  };
  screening_result: string;
  screened_entity: string;
  screening_screened_at: string;
  exec_tx_hash: string | null;
  exec_chain: string;
  exec_observed_onchain: boolean;
  record_hash: string;
  previous_record_hash: string;
  chain_index: number;
  render_headline: string;
  render_subheadline: string;
  render_risk_label: string;
}

export interface GroundedPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export class PromptGrounder {
  buildPrompt(evidence: EvidenceData, template: NarrativeTemplate): GroundedPrompt {
    const systemPrompt = [
      template.systemPrompt,
      '',
      'HARD CONSTRAINT: You MUST NOT include any information not present in the following evidence data.',
      'Do not speculate, infer external facts, or reference data not explicitly provided below.',
      'If a field is null or empty, state that information is not available.',
    ].join('\n');

    const sectionInstructions = template.requiredSections
      .map((s) => {
        const emphasis = template.sectionEmphasis[s] ?? '';
        return `## ${s}\n${emphasis}`;
      })
      .join('\n\n');

    const userPrompt = [
      'Generate a compliance narrative with the following sections. Output each section as a markdown heading (## section_name) followed by the narrative text.',
      '',
      '--- EVIDENCE DATA ---',
      '',
      `Event ID: ${evidence.event_id}`,
      `Event Status: ${evidence.status}`,
      `Timestamp: ${evidence.created_at}`,
      `Workflow: ${evidence.workflow}`,
      '',
      '### Agent',
      `Agent ID: ${evidence.agent_id}`,
      `Agent Type: ${evidence.agent_type ?? 'N/A'}`,
      `Actor Type: ${evidence.actor_type}`,
      '',
      '### Payment',
      `Transaction Hash: ${evidence.payment_tx_hash ?? 'N/A'}`,
      `Chain: ${evidence.payment_chain}`,
      `Rail: ${evidence.payment_rail}`,
      `Token: ${evidence.payment_token}`,
      `Amount: ${evidence.payment_amount} ${evidence.payment_currency}`,
      `USD Equivalent: $${evidence.payment_usd_equivalent}`,
      `From: ${evidence.payment_from_address}`,
      `To: ${evidence.payment_to_address}`,
      `Destination Country: ${evidence.payment_destination_country ?? 'N/A'}`,
      '',
      '### Sanctions Screening',
      `OFAC Status: ${evidence.ofac_status}`,
      `Screening Provider: ${evidence.screening_provider ?? 'kontext-ofac-v1'}`,
      `Screening Result: ${evidence.screening_result}`,
      `Screened Entity: ${evidence.screened_entity}`,
      `Screened At: ${evidence.screening_screened_at}`,
      '',
      '### Policy Evaluation',
      `Decision: ${evidence.policy_decision}`,
      `Policy Trace Decision: ${evidence.policy_trace.decision}`,
      `Rules Evaluated: ${evidence.policy_trace.rules_evaluated}`,
      `Passed Rules: ${evidence.policy_trace.passed_rules.join(', ') || 'none'}`,
      `Failed Rules: ${evidence.policy_trace.failed_rules.join(', ') || 'none'}`,
      `Warning Rules: ${evidence.policy_trace.warning_rules.join(', ') || 'none'}`,
      `Violations: ${evidence.policy_violations.join(', ') || 'none'}`,
      `Warnings: ${evidence.policy_warnings.join(', ') || 'none'}`,
      `Applied Policy IDs: ${evidence.applied_policy_ids.join(', ') || 'none'}`,
      '',
      '### Trust Assessment',
      `Trust Score: ${evidence.trust_score}`,
      `Trust Band: ${evidence.trust_band}`,
      `Trust Reasons: ${evidence.trust_reasons.join(', ') || 'none'}`,
      '',
      '### Authorization',
      `Authorization Type: ${evidence.authorization_type}`,
      `Authorized: ${evidence.authorized}`,
      `Authorizer: ${evidence.authorizer}`,
      '',
      '### Cryptographic Proof',
      `Intent Hash: ${evidence.intent_hash_algorithm}:${evidence.intent_hash_value}`,
      `Record Hash: ${evidence.record_hash}`,
      `Previous Record Hash: ${evidence.previous_record_hash}`,
      `Chain Index: ${evidence.chain_index}`,
      `Execution TX Hash: ${evidence.exec_tx_hash ?? 'N/A'}`,
      `Execution Chain: ${evidence.exec_chain}`,
      `Observed On-Chain: ${evidence.exec_observed_onchain}`,
      '',
      '--- SECTION INSTRUCTIONS ---',
      '',
      sectionInstructions,
      '',
      'Output the narrative as markdown. Use ## headings for each section. Be precise and cite specific values from the evidence data.',
    ].join('\n');

    return { systemPrompt, userPrompt };
  }
}
