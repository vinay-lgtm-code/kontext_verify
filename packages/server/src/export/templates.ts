// ============================================================================
// Kontext Server — Export Templates: Examiner-Ready Evidence Formatting
// ============================================================================
// 4 templates, each defining columns + row transformation for compliance exports.
// Templates operate on joined verification_events + evidence_bundles rows.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Combined row from verification_events JOIN evidence_bundles */
export interface EvidenceRow {
  // verification_events fields
  event_id: string;
  org_id: string;
  environment: string;
  status: string;
  created_at: string;
  verified_at: string | null;
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
  payment_usd_equivalent: string | null;
  payment_from_address: string;
  payment_to_address: string;
  payment_destination_country: string | null;
  payment_counterparty_id: string | null;
  intent_id: string;
  intent_type: string;
  intent_declared_purpose: string | null;
  intent_requested_by: string;
  intent_requested_at: string;
  policy_decision: string;
  policy_version: string | null;
  policy_violations: string[];
  policy_warnings: string[];
  applied_policy_ids: string[];
  ofac_status: string;
  screened_at: string | null;
  screening_provider: string | null;
  trust_score: number;
  trust_band: string;
  trust_reasons: string[];
  coverage_source: string;
  wallet_monitored: boolean;
  chain_listener_confirmed: boolean;
  coverage_status: string;
  evidence_bundle_id: string;
  team_tag: string | null;
  business_unit_tag: string | null;

  // evidence_bundles fields (prefixed eb_ to disambiguate)
  intent_hash_algorithm: string;
  intent_hash_value: string;
  intent_hash_canonical_fields: string[];
  authorization_type: string;
  authorized: boolean;
  authorizer: string;
  authorization_scope: string | null;
  evaluated_at: string;
  policy_trace: Record<string, unknown>;
  eb_screening_provider: string;
  screening_result: string;
  screened_entity: string;
  screening_screened_at: string;
  exec_tx_hash: string | null;
  exec_chain: string;
  exec_observed_onchain: boolean;
  exec_first_seen_at: string | null;
  exec_confirmation_status: string | null;
  record_hash: string;
  previous_record_hash: string;
  chain_index: number;
  render_headline: string;
  render_subheadline: string;
  render_risk_label: string;
}

export interface ExportTemplate {
  name: string;
  description: string;
  columns: string[];
  transformRow: (row: EvidenceRow) => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helper: truncate address for PII redaction (first 6 + last 4)
// ---------------------------------------------------------------------------

function redactAddress(addr: string | null): string {
  if (!addr) return '';
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function hashString(value: string): string {
  // Simple deterministic hash for redaction (not crypto-secure, just PII-safe)
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const chr = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `agent_${Math.abs(hash).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Template: examiner — Full compliance packet for bank examiners
// ---------------------------------------------------------------------------

const examinerTemplate: ExportTemplate = {
  name: 'examiner',
  description: 'Full compliance packet — all fields. Used by bank examiners.',
  columns: [
    'event_id', 'status', 'created_at', 'verified_at', 'environment',
    'workflow', 'agent_id', 'agent_type', 'actor_type',
    'payment_tx_hash', 'payment_chain', 'payment_rail', 'payment_token',
    'payment_amount', 'payment_currency', 'payment_usd_equivalent',
    'payment_from_address', 'payment_to_address', 'payment_destination_country',
    'payment_counterparty_id',
    'intent_id', 'intent_type', 'intent_declared_purpose',
    'intent_requested_by', 'intent_requested_at',
    'policy_decision', 'policy_version', 'policy_violations', 'policy_warnings',
    'applied_policy_ids',
    'ofac_status', 'screened_at', 'screening_provider', 'screening_result',
    'screened_entity',
    'trust_score', 'trust_band', 'trust_reasons',
    'coverage_source', 'wallet_monitored', 'chain_listener_confirmed', 'coverage_status',
    'intent_hash_algorithm', 'intent_hash_value',
    'authorization_type', 'authorized', 'authorizer', 'authorization_scope',
    'policy_trace',
    'exec_tx_hash', 'exec_chain', 'exec_observed_onchain', 'exec_confirmation_status',
    'record_hash', 'previous_record_hash', 'chain_index',
    'render_headline', 'render_risk_label',
    'team_tag', 'business_unit_tag',
  ],
  transformRow: (row: EvidenceRow): Record<string, unknown> => ({
    event_id: row.event_id,
    status: row.status,
    created_at: row.created_at,
    verified_at: row.verified_at,
    environment: row.environment,
    workflow: row.workflow,
    agent_id: row.agent_id,
    agent_type: row.agent_type,
    actor_type: row.actor_type,
    payment_tx_hash: row.payment_tx_hash,
    payment_chain: row.payment_chain,
    payment_rail: row.payment_rail,
    payment_token: row.payment_token,
    payment_amount: row.payment_amount,
    payment_currency: row.payment_currency,
    payment_usd_equivalent: row.payment_usd_equivalent,
    payment_from_address: row.payment_from_address,
    payment_to_address: row.payment_to_address,
    payment_destination_country: row.payment_destination_country,
    payment_counterparty_id: row.payment_counterparty_id,
    intent_id: row.intent_id,
    intent_type: row.intent_type,
    intent_declared_purpose: row.intent_declared_purpose,
    intent_requested_by: row.intent_requested_by,
    intent_requested_at: row.intent_requested_at,
    policy_decision: row.policy_decision,
    policy_version: row.policy_version,
    policy_violations: Array.isArray(row.policy_violations) ? row.policy_violations.join('; ') : '',
    policy_warnings: Array.isArray(row.policy_warnings) ? row.policy_warnings.join('; ') : '',
    applied_policy_ids: Array.isArray(row.applied_policy_ids) ? row.applied_policy_ids.join('; ') : '',
    ofac_status: row.ofac_status,
    screened_at: row.screened_at,
    screening_provider: row.screening_provider ?? row.eb_screening_provider,
    screening_result: row.screening_result,
    screened_entity: row.screened_entity,
    trust_score: row.trust_score,
    trust_band: row.trust_band,
    trust_reasons: Array.isArray(row.trust_reasons) ? row.trust_reasons.join('; ') : '',
    coverage_source: row.coverage_source,
    wallet_monitored: row.wallet_monitored,
    chain_listener_confirmed: row.chain_listener_confirmed,
    coverage_status: row.coverage_status,
    intent_hash_algorithm: row.intent_hash_algorithm,
    intent_hash_value: row.intent_hash_value,
    authorization_type: row.authorization_type,
    authorized: row.authorized,
    authorizer: row.authorizer,
    authorization_scope: row.authorization_scope,
    policy_trace: JSON.stringify(row.policy_trace),
    exec_tx_hash: row.exec_tx_hash,
    exec_chain: row.exec_chain,
    exec_observed_onchain: row.exec_observed_onchain,
    exec_confirmation_status: row.exec_confirmation_status,
    record_hash: row.record_hash,
    previous_record_hash: row.previous_record_hash,
    chain_index: row.chain_index,
    render_headline: row.render_headline,
    render_risk_label: row.render_risk_label,
    team_tag: row.team_tag,
    business_unit_tag: row.business_unit_tag,
  }),
};

// ---------------------------------------------------------------------------
// Template: diligence — Due diligence subset for compliance officers
// ---------------------------------------------------------------------------

const diligenceTemplate: ExportTemplate = {
  name: 'diligence',
  description: 'Due diligence subset — payment details + screening + policy evaluation. For compliance officers reviewing specific transactions.',
  columns: [
    'event_id', 'status', 'created_at',
    'agent_id', 'workflow',
    'payment_tx_hash', 'payment_chain', 'payment_token',
    'payment_amount', 'payment_usd_equivalent',
    'payment_from_address', 'payment_to_address', 'payment_destination_country',
    'ofac_status', 'screening_provider', 'screening_result', 'screened_at',
    'policy_decision', 'policy_violations', 'policy_warnings',
    'trust_score', 'trust_band',
    'authorization_type', 'authorized', 'authorizer',
    'intent_declared_purpose',
    'record_hash', 'chain_index',
  ],
  transformRow: (row: EvidenceRow): Record<string, unknown> => ({
    event_id: row.event_id,
    status: row.status,
    created_at: row.created_at,
    agent_id: row.agent_id,
    workflow: row.workflow,
    payment_tx_hash: row.payment_tx_hash,
    payment_chain: row.payment_chain,
    payment_token: row.payment_token,
    payment_amount: row.payment_amount,
    payment_usd_equivalent: row.payment_usd_equivalent,
    payment_from_address: row.payment_from_address,
    payment_to_address: row.payment_to_address,
    payment_destination_country: row.payment_destination_country,
    ofac_status: row.ofac_status,
    screening_provider: row.screening_provider ?? row.eb_screening_provider,
    screening_result: row.screening_result,
    screened_at: row.screened_at,
    policy_decision: row.policy_decision,
    policy_violations: Array.isArray(row.policy_violations) ? row.policy_violations.join('; ') : '',
    policy_warnings: Array.isArray(row.policy_warnings) ? row.policy_warnings.join('; ') : '',
    trust_score: row.trust_score,
    trust_band: row.trust_band,
    authorization_type: row.authorization_type,
    authorized: row.authorized,
    authorizer: row.authorizer,
    intent_declared_purpose: row.intent_declared_purpose,
    record_hash: row.record_hash,
    chain_index: row.chain_index,
  }),
};

// ---------------------------------------------------------------------------
// Template: incident — Flagged/blocked events only for investigation
// ---------------------------------------------------------------------------

const incidentTemplate: ExportTemplate = {
  name: 'incident',
  description: 'Incident response — flagged/blocked events only, with anomaly details. For investigating suspicious activity.',
  columns: [
    'event_id', 'status', 'created_at',
    'agent_id', 'agent_type', 'actor_type', 'workflow',
    'payment_tx_hash', 'payment_chain', 'payment_token',
    'payment_amount', 'payment_usd_equivalent',
    'payment_from_address', 'payment_to_address',
    'ofac_status', 'screening_result', 'screened_entity',
    'policy_decision', 'policy_violations', 'policy_warnings',
    'trust_score', 'trust_band', 'trust_reasons',
    'coverage_status',
    'intent_declared_purpose',
    'render_headline', 'render_risk_label',
    'record_hash', 'chain_index',
  ],
  transformRow: (row: EvidenceRow): Record<string, unknown> => ({
    event_id: row.event_id,
    status: row.status,
    created_at: row.created_at,
    agent_id: row.agent_id,
    agent_type: row.agent_type,
    actor_type: row.actor_type,
    workflow: row.workflow,
    payment_tx_hash: row.payment_tx_hash,
    payment_chain: row.payment_chain,
    payment_token: row.payment_token,
    payment_amount: row.payment_amount,
    payment_usd_equivalent: row.payment_usd_equivalent,
    payment_from_address: row.payment_from_address,
    payment_to_address: row.payment_to_address,
    ofac_status: row.ofac_status,
    screening_result: row.screening_result,
    screened_entity: row.screened_entity,
    policy_decision: row.policy_decision,
    policy_violations: Array.isArray(row.policy_violations) ? row.policy_violations.join('; ') : '',
    policy_warnings: Array.isArray(row.policy_warnings) ? row.policy_warnings.join('; ') : '',
    trust_score: row.trust_score,
    trust_band: row.trust_band,
    trust_reasons: Array.isArray(row.trust_reasons) ? row.trust_reasons.join('; ') : '',
    coverage_status: row.coverage_status,
    intent_declared_purpose: row.intent_declared_purpose,
    render_headline: row.render_headline,
    render_risk_label: row.render_risk_label,
    record_hash: row.record_hash,
    chain_index: row.chain_index,
  }),
};

// ---------------------------------------------------------------------------
// Template: redacted — PII-safe for external sharing
// ---------------------------------------------------------------------------

const redactedTemplate: ExportTemplate = {
  name: 'redacted',
  description: 'PII-safe for external sharing — truncated addresses, hashed agent IDs. For sharing with third parties.',
  columns: [
    'event_id', 'status', 'created_at',
    'agent_id_hash', 'workflow',
    'payment_chain', 'payment_token',
    'payment_amount', 'payment_usd_equivalent',
    'payment_from_address', 'payment_to_address',
    'ofac_status', 'screening_result',
    'policy_decision', 'policy_violations',
    'trust_score', 'trust_band',
    'record_hash', 'chain_index',
  ],
  transformRow: (row: EvidenceRow): Record<string, unknown> => ({
    event_id: row.event_id,
    status: row.status,
    created_at: row.created_at,
    agent_id_hash: hashString(row.agent_id),
    workflow: row.workflow,
    payment_chain: row.payment_chain,
    payment_token: row.payment_token,
    payment_amount: row.payment_amount,
    payment_usd_equivalent: row.payment_usd_equivalent,
    payment_from_address: redactAddress(row.payment_from_address),
    payment_to_address: redactAddress(row.payment_to_address),
    ofac_status: row.ofac_status,
    screening_result: row.screening_result,
    policy_decision: row.policy_decision,
    policy_violations: Array.isArray(row.policy_violations) ? row.policy_violations.join('; ') : '',
    trust_score: row.trust_score,
    trust_band: row.trust_band,
    record_hash: row.record_hash,
    chain_index: row.chain_index,
  }),
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const EXPORT_TEMPLATES: Record<string, ExportTemplate> = {
  examiner: examinerTemplate,
  diligence: diligenceTemplate,
  incident: incidentTemplate,
  redacted: redactedTemplate,
};

export function getTemplate(name: string): ExportTemplate | undefined {
  return EXPORT_TEMPLATES[name];
}

export const TEMPLATE_NAMES = Object.keys(EXPORT_TEMPLATES);
