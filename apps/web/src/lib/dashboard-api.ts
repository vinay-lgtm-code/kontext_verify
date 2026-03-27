// ============================================================================
// Dashboard API Client — Typed fetch wrapper with auth
// ============================================================================

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kontext_api_key');
}

/** Read the stored role from localStorage. Set during login via /v1/account. */
export function getRole(): 'admin' | 'staff-dev' | 'staff-risk' | null {
  if (typeof window === 'undefined') return null;
  const role = localStorage.getItem('kontext_user_role');
  if (role === 'admin' || role === 'staff-dev' || role === 'staff-risk') return role;
  return null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('kontext_api_key');
    localStorage.removeItem('kontext_user_role');
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  return res.json();
}

// ---------- Types ----------

export interface KpiData {
  org_id: string;
  environment: string;
  as_of: string;
  verified_payouts_today: number;
  unverified_payouts_today: number;
  org_trust_score: number | null;
  sanctions_alerts_today: number;
  policy_violations_today: number;
  coverage_pct_7d: number | null;
}

export interface VerificationEvent {
  event_id: string;
  org_id: string;
  environment: string;
  status: 'verified' | 'warning' | 'blocked' | 'unverified';
  created_at: string;
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
  coverage_status: string;
  evidence_bundle_id: string;
  team_tag: string | null;
  business_unit_tag: string | null;
  // Instrument fields
  instrument_id: string | null;
  instrument_type: string | null;
  instrument_network: string | null;
  instrument_issuer: string | null;
  instrument_scope: Record<string, unknown> | null;
  // Card-specific fields
  payment_card_last4: string | null;
  payment_merchant_category_code: string | null;
  payment_merchant_name: string | null;
  payment_merchant_country: string | null;
  payment_three_d_secure: string | null;
  payment_card_authorization_id: string | null;
}

export interface EvidenceBundle {
  evidence_bundle_id: string;
  event_id: string;
  org_id: string;
  intent_hash_algorithm: string;
  intent_hash_value: string;
  intent_hash_canonical_fields: string[];
  authorization_type: string;
  authorized: boolean;
  authorizer: string;
  authorization_scope: string | null;
  evaluated_at: string;
  policy_trace: {
    decision: string;
    rules_evaluated: number;
    passed_rules: string[];
    failed_rules: string[];
    warning_rules: string[];
  };
  screening_provider: string;
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
  // Card/instrument evidence
  instrument_id: string | null;
  instrument_issuer: string | null;
  card_authorization_id: string | null;
  card_3ds_status: string | null;
  merchant_screened_name: string | null;
  scope_evaluation: { within_scope: boolean; violations: string[] } | null;
  reserve_snapshot?: {
    token: string;
    chain: string;
    onChainSupply: string;
    publishedReserves?: string;
    delta?: string;
    reconciliationStatus: 'matched' | 'delta_within_tolerance' | 'discrepancy' | 'unverified';
    snapshotBlockNumber: number;
    snapshotBlockHash: string;
    timestamp: string;
  };
  created_at: string;
}

export interface AgentData {
  agent_id: string;
  agent_type: string | null;
  actor_type: string | null;
  trust_score_avg: number | null;
  payout_count_24h: number;
  volume_24h_usd: string;
  anomaly_count_24h: number;
  last_seen: string;
  recent_events: Array<{
    event_id: string;
    status: string;
    amount: string;
    token: string;
    created_at: string;
  }>;
  authorized_chains: string[];
  authorized_tokens: string[];
}

export interface PolicyData {
  policy_id: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
  violations_today: number;
  impact_pct: number;
}

export interface PolicyViolation {
  event_id: string;
  created_at: string;
  agent_id: string;
  workflow: string;
  amount: string;
  token: string;
  policy_decision: string;
  policy_violations: string[];
  policy_warnings: string[];
  applied_policy_ids: string[];
  status: string;
}

// ---------- API Methods ----------

export async function getKpis(env = 'production'): Promise<KpiData> {
  return apiFetch(`/kpis?environment=${env}`);
}

export interface EventsFilters {
  status?: string;
  agent_id?: string;
  chain?: string;
  rail?: string;
  instrument_type?: string;
  instrument_issuer?: string;
  limit?: number;
  cursor?: string;
}

export async function getVerificationEvents(
  filters: EventsFilters = {},
): Promise<{ events: VerificationEvent[]; next_cursor: string | null; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.agent_id) params.set('agent_id', filters.agent_id);
  if (filters.chain) params.set('chain', filters.chain);
  if (filters.rail) params.set('rail', filters.rail);
  if (filters.instrument_type) params.set('instrument_type', filters.instrument_type);
  if (filters.instrument_issuer) params.set('instrument_issuer', filters.instrument_issuer);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();
  return apiFetch(`/verification-events${qs ? `?${qs}` : ''}`);
}

export async function getEvidence(eventId: string): Promise<EvidenceBundle> {
  return apiFetch(`/verification-events/${eventId}/evidence`);
}

export async function getAgents(env = 'production'): Promise<{ agents: AgentData[]; count: number }> {
  return apiFetch(`/agents?environment=${env}`);
}

export async function getPolicies(env = 'production'): Promise<{ policies: PolicyData[]; total_events_today: number }> {
  return apiFetch(`/policies?environment=${env}`);
}

export async function getPolicyViolations(
  limit = 20,
): Promise<{ violations: PolicyViolation[]; count: number }> {
  return apiFetch(`/policies/violations?limit=${limit}`);
}

export async function createAuditExport(options: {
  format: string;
  date_range: { from: string; to: string };
}): Promise<{ export_id: string; status: string; event_count: number; data: unknown[] }> {
  return apiFetch('/audit-exports', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export interface TeamMember {
  user_id: string;
  email: string;
  role: string;
  status: string;
}

export async function getTeamMembers(): Promise<{ members: TeamMember[]; count: number }> {
  return apiFetch('/team/members');
}

export async function assignEvent(
  eventId: string,
  userId: string,
): Promise<{ assigned: boolean; eventId: string; assignedTo: string }> {
  return apiFetch(`/events/${eventId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

// ---------- Evidence Export API ----------

export type ExportTemplate = 'examiner' | 'diligence' | 'incident' | 'redacted';
export type ExportFormat = 'json' | 'csv' | 'pdf';

export interface BulkExportFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  agent_id?: string;
  chain?: string;
}

export interface BulkExportResponse {
  export_id: string;
  status: 'processing';
  estimated_events: number;
  template: string;
  format: string;
}

export interface ExportProgressResponse {
  export_id: string;
  status: 'processing' | 'complete' | 'failed';
  progress_pct: number;
  download_url: string | null;
  error: string | null;
  file_size_bytes?: number | null;
  event_count?: number | null;
  completed_at?: string | null;
}

export async function exportSingleEvent(
  eventId: string,
  template: ExportTemplate = 'examiner',
  format: ExportFormat = 'json',
): Promise<unknown> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(
    `${API_BASE}/v1/verification-events/${eventId}/export?template=${template}&format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? `Export failed: ${res.status}`);
  }

  if (format === 'json') {
    return res.json();
  }

  // For CSV/PDF, trigger a download
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kontext-${eventId}-${template}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  return { downloaded: true };
}

export async function createBulkExport(
  template: ExportTemplate,
  format: ExportFormat,
  filters?: BulkExportFilters,
): Promise<BulkExportResponse> {
  return apiFetch('/exports/bulk', {
    method: 'POST',
    body: JSON.stringify({ template, format, filters }),
  });
}

export async function getExportProgress(exportId: string): Promise<ExportProgressResponse> {
  return apiFetch(`/exports/${exportId}/progress`);
}
