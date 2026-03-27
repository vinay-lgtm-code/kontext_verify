// ============================================================================
// Kontext API Server — Verification Event Ingestion Handler
// ============================================================================
//
// POST /v1/verification-events
//
// Architecture rules enforced here:
//   1. SDK sends facts only — no trust claims, no scores, no hashes
//   2. Server derives everything: policy, screening, trust, digest chain
//   3. digest_chain_state update + event insert are ATOMIC (single transaction)
//   4. evidence_bundle is pre-built at ingestion — never reconstructed at read time
//   5. tamper-evident fields (record_hash, previous_record_hash, chain_index)
//      are NEVER accepted from client — stripped at validation boundary
//
// Digest chain formula (US Patent 12,463,819 B1):
//   HD = SHA-256(HD-1 || Serialize(ED) || SD)
//   where SD = SHA-256(microsecond hrtime)
// ============================================================================

import { createHash, randomBytes } from 'crypto';
import type { Pool, PoolClient } from 'pg';
import type { ScreeningEngine } from './screening/screening-engine.js';
import type { AddressScreeningResponse, EntityScreeningResponse } from './screening/types.js';

// ---------------------------------------------------------------------------
// ID Generation (ULID-style: time-sortable, URL-safe)
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const random = randomBytes(10).toString('base64url').toUpperCase().slice(0, 16);
  return `${prefix}_${timestamp}${random}`;
}

// ---------------------------------------------------------------------------
// Inbound Types — what the SDK is allowed to send
// ---------------------------------------------------------------------------

export interface IngestInstrument {
  instrument_id: string;
  instrument_type: string; // blockchain_wallet, virtual_card, bank_account, payment_token
  instrument_network: string; // visa, mastercard, base, ethereum, ach, etc.
  instrument_issuer?: string;
  instrument_scope?: Record<string, unknown>;
}

export interface IngestPayment {
  tx_hash?: string;
  chain: string;
  rail: 'stablecoin' | 'fiat' | 'card';
  token: string;
  amount: string;
  currency: string;
  from_address: string;
  to_address: string;
  destination_country?: string; // ISO 3166-1 alpha-2
  counterparty_id?: string;

  // Unified instrument (optional)
  instrument?: IngestInstrument;

  // Card-specific flat convenience fields
  card_last4?: string;
  merchant_category_code?: string;
  merchant_name?: string;
  merchant_country?: string; // ISO 3166-1 alpha-2
  three_d_secure_status?: string;
  card_platform?: string; // normalized to instrument_issuer
  card_authorization_id?: string;
  card_spend_limit?: string; // normalized to instrument_scope
}

export interface IngestIntent {
  intent_type: string;
  declared_purpose?: string;
  requested_by: string;
  requested_at: string; // ISO 8601
}

export interface IngestPolicyInputs {
  wallet_known?: boolean;
  counterparty_known?: boolean;
  amount_limit_usd?: string;
}

export interface IngestRequest {
  // Populated from API key auth — never from request body
  org_id?: string; // set by auth middleware

  environment: 'sandbox' | 'production';
  workflow: string;
  agent_id: string;
  agent_type?: string;
  actor_type: 'autonomous-agent' | 'human-assisted-agent' | 'human';

  payment: IngestPayment;
  intent: IngestIntent;
  policy_inputs?: IngestPolicyInputs;

  tenant_tags?: {
    team?: string;
    business_unit?: string;
  };
}

// ---------------------------------------------------------------------------
// Derived Types — server-computed, never from client
// ---------------------------------------------------------------------------

type PolicyDecision = 'allow' | 'warn' | 'block';
type OfacStatus = 'clear' | 'match' | 'review_required';
type TrustBand = 'low' | 'medium' | 'high';
type CoverageStatus = 'full' | 'partial' | 'none';
type EventStatus = 'verified' | 'warning' | 'blocked' | 'unverified';

interface PolicyResult {
  decision: PolicyDecision;
  policy_version: string;
  applied_policy_ids: string[];
  violations: string[];
  warnings: string[];
}

interface ScreeningResult {
  ofac_status: OfacStatus;
  screened_at: string;
  screening_provider: string;
  matches: string[];
}

interface TrustScore {
  score: number;       // 0-100
  band: TrustBand;
  reasons: string[];
}

interface CoverageResult {
  source: 'sdk-wrap' | 'chain-listener' | 'hybrid';
  wallet_monitored: boolean;
  chain_listener_confirmed: boolean;
  coverage_status: CoverageStatus;
}

interface TamperEvidence {
  record_hash: string;
  previous_record_hash: string;
  chain_index: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SUPPORTED_CHAINS = new Set([
  'ethereum', 'base', 'polygon', 'arbitrum', 'optimism',
  'arc', 'avalanche', 'solana',
]);

const SUPPORTED_TOKENS = new Set(['USDC', 'USDT', 'DAI', 'EURC']);

/** Card networks accepted when rail === 'card' */
const SUPPORTED_CARD_NETWORKS = new Set([
  'visa', 'mastercard', 'amex', 'discover',
]);

/** OFAC comprehensively sanctioned countries */
const SANCTIONED_COUNTRIES = new Set(['CU', 'IR', 'KP', 'SY']);

export class ValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateIngestRequest(body: unknown): IngestRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('INVALID_BODY', 'Request body must be a JSON object');
  }

  const req = body as Record<string, unknown>;

  // Required top-level fields
  for (const field of ['environment', 'workflow', 'agent_id', 'actor_type', 'payment', 'intent']) {
    if (!req[field]) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', `Missing required field: ${field}`);
    }
  }

  const payment = req['payment'] as Record<string, unknown>;
  const intent = req['intent'] as Record<string, unknown>;

  // Payment validation — required fields depend on rail
  const rail = payment['rail'] as string;
  const baseFields = ['rail', 'amount', 'currency', 'from_address', 'to_address'];
  // chain and token are required for stablecoin/fiat, but for card rail chain holds the card network
  for (const field of [...baseFields, 'chain', 'token']) {
    if (!payment[field]) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', `Missing required payment field: payment.${field}`);
    }
  }

  if (rail === 'card') {
    // For card rail, 'chain' holds the card network (visa, mastercard, etc.)
    const network = (payment['chain'] as string).toLowerCase();
    if (!SUPPORTED_CARD_NETWORKS.has(network)) {
      throw new ValidationError('INVALID_CHAIN', `Unsupported card network: ${payment['chain']}. Supported: ${Array.from(SUPPORTED_CARD_NETWORKS).join(', ')}`);
    }
    // Normalize card_platform → instrument_issuer
    if (payment['card_platform'] && !payment['instrument']) {
      payment['instrument'] = {
        instrument_id: payment['card_last4'] ? `****${payment['card_last4']}` : 'unknown',
        instrument_type: 'virtual_card',
        instrument_network: network,
        instrument_issuer: payment['card_platform'],
      };
    }
  } else {
    if (!SUPPORTED_CHAINS.has(payment['chain'] as string)) {
      throw new ValidationError('INVALID_CHAIN', `Unsupported chain: ${payment['chain']}`);
    }

    if (!SUPPORTED_TOKENS.has(payment['token'] as string)) {
      throw new ValidationError('INVALID_TOKEN', `Unsupported token: ${payment['token']}`);
    }
  }

  const amount = parseFloat(payment['amount'] as string);
  if (isNaN(amount) || amount <= 0) {
    throw new ValidationError('AMOUNT_PARSE_ERROR', `Invalid amount: ${payment['amount']}`);
  }

  // destination_country: if present, must be exactly 2 uppercase letters
  if (payment['destination_country'] !== undefined) {
    const cc = payment['destination_country'] as string;
    if (!/^[A-Z]{2}$/.test(cc)) {
      throw new ValidationError(
        'INVALID_COUNTRY_CODE',
        `destination_country must be ISO 3166-1 alpha-2 (e.g. "MX"), got: ${cc}`,
      );
    }
  }

  // Intent validation
  for (const field of ['intent_type', 'requested_by', 'requested_at']) {
    if (!intent[field]) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', `Missing required intent field: intent.${field}`);
    }
  }

  // Strip any tamper-evident fields the client may have tried to inject
  const FORBIDDEN_CLIENT_FIELDS = [
    'record_hash', 'previous_record_hash', 'chain_index',
    'intent_hash', 'event_id', 'evidence_bundle_id',
    'policy_result', 'screening_result', 'trust_score',
  ];
  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (field in req) {
      delete (req as Record<string, unknown>)[field];
    }
  }

  return req as unknown as IngestRequest;
}

// ---------------------------------------------------------------------------
// Policy Engine
// ---------------------------------------------------------------------------

interface OrgPolicy {
  payout_limit_usd: number;
  allowed_chains: string[];
  blocked_countries: string[];
  require_screening: boolean;
}

async function evaluatePolicy(
  db: PoolClient,
  orgId: string,
  req: IngestRequest,
): Promise<PolicyResult> {
  // Load org policy — fallback to defaults if not configured
  const policyRow = await db.query(
    'SELECT policy_config FROM org_policies WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1',
    [orgId],
  ).catch(() => ({ rows: [] }));

  const policy: OrgPolicy = policyRow.rows[0]?.policy_config ?? {
    payout_limit_usd: 10_000,
    allowed_chains: Array.from(SUPPORTED_CHAINS),
    blocked_countries: [],
    require_screening: true,
  };

  const violations: string[] = [];
  const warnings: string[] = [];
  const appliedPolicies: string[] = [];

  const amount = parseFloat(req.payment.amount);

  // Rule: payout limit
  appliedPolicies.push('pol_payout_limit_usd');
  if (amount > policy.payout_limit_usd) {
    violations.push(`Amount ${amount} exceeds org payout limit ${policy.payout_limit_usd}`);
  }

  // Rule: allowed chains
  appliedPolicies.push('pol_allowed_chains');
  if (!policy.allowed_chains.includes(req.payment.chain)) {
    violations.push(`Chain ${req.payment.chain} not in org allowlist`);
  }

  // Rule: blocked countries
  if (req.payment.destination_country) {
    appliedPolicies.push('pol_country_restrictions');
    if (policy.blocked_countries.includes(req.payment.destination_country)) {
      violations.push(`Destination country ${req.payment.destination_country} is blocked`);
    }
  }

  // Rule: GENIUS Act threshold warning (>$3k triggers enhanced due diligence)
  appliedPolicies.push('pol_genius_act_threshold');
  if (amount >= 3_000) {
    warnings.push('Amount exceeds GENIUS Act enhanced due diligence threshold ($3,000)');
  }

  // Rule: CTR threshold warning ($10k+)
  appliedPolicies.push('pol_ctr_threshold');
  if (amount >= 10_000) {
    warnings.push('Amount at or above CTR reporting threshold ($10,000)');
  }

  // Card-specific rules (only when rail === 'card')
  if (req.payment.rail === 'card') {
    // Rule: merchant country screening
    if (req.payment.merchant_country) {
      appliedPolicies.push('pol_card_merchant_country');
      const mc = req.payment.merchant_country.toUpperCase();
      if (SANCTIONED_COUNTRIES.has(mc)) {
        violations.push(`Merchant country ${mc} is under OFAC comprehensive sanctions`);
      }
    }

    // Rule: high-risk MCC
    const HIGH_RISK_MCCS = new Set(['6012', '6051', '6211', '5967', '7995', '5962', '5966']);
    if (req.payment.merchant_category_code) {
      appliedPolicies.push('pol_card_mcc_restriction');
      if (HIGH_RISK_MCCS.has(req.payment.merchant_category_code)) {
        warnings.push(`High-risk MCC ${req.payment.merchant_category_code}`);
      }
    }

    // Rule: 3DS requirement for amounts >= $3k
    if (amount >= 3_000) {
      appliedPolicies.push('pol_card_3ds_requirement');
      const tds = req.payment.three_d_secure_status;
      if (!tds || tds === 'none' || tds === 'failed') {
        violations.push(`3D Secure not verified for card payment >= $3,000 (status: ${tds ?? 'none'})`);
      }
    }

    // Rule: instrument scope validation
    const scope = req.payment.instrument?.instrument_scope as Record<string, unknown> | undefined;
    if (scope) {
      appliedPolicies.push('pol_instrument_scope_violation');
      const maxTx = scope['maxTransactionAmount'] as string | undefined;
      if (maxTx && amount > parseFloat(maxTx)) {
        violations.push(`Amount ${amount} exceeds instrument max transaction limit ${maxTx}`);
      }
      const spendLimit = scope['spendLimit'] as string | undefined;
      if (spendLimit && amount > parseFloat(spendLimit)) {
        violations.push(`Amount ${amount} exceeds instrument spend limit ${spendLimit}`);
      }
      const blockedMccs = scope['blockedMerchantCategories'] as string[] | undefined;
      if (blockedMccs && req.payment.merchant_category_code && blockedMccs.includes(req.payment.merchant_category_code)) {
        violations.push(`MCC ${req.payment.merchant_category_code} is blocked by instrument scope`);
      }
    }
  }

  const decision: PolicyDecision =
    violations.length > 0 ? 'block' :
    warnings.length > 0  ? 'warn'  :
    'allow';

  return {
    decision,
    policy_version: new Date().toISOString().slice(0, 10),
    applied_policy_ids: appliedPolicies,
    violations,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// OFAC / Sanctions Screening (via ScreeningEngine)
// ---------------------------------------------------------------------------

/** Extended screening result that includes engine response metadata */
interface ScreeningResultWithMeta extends ScreeningResult {
  listsChecked: string[];
  entityId: string | null;
  entityName: string | null;
  durationMs: number;
}

function addressResponseToOfacStatus(resp: AddressScreeningResponse): OfacStatus {
  return resp.hit ? 'match' : 'clear';
}

async function runScreening(
  req: IngestRequest,
  engine: ScreeningEngine | null,
): Promise<ScreeningResultWithMeta> {
  // If engine is not ready, return a degraded but safe result
  if (!engine || !engine.isReady()) {
    return {
      ofac_status: 'review_required',
      screened_at: new Date().toISOString(),
      screening_provider: 'none',
      matches: [],
      listsChecked: [],
      entityId: null,
      entityName: null,
      durationMs: 0,
    };
  }

  if (req.payment.rail === 'card') {
    // Card rail: screen merchant name + merchant country
    const matches: string[] = [];
    let ofac_status: OfacStatus = 'clear';
    let entityId: string | null = null;
    let entityName: string | null = null;
    let totalDurationMs = 0;
    let listsChecked: string[] = [];

    // Screen merchant country against sanctions
    if (req.payment.merchant_country) {
      const mc = req.payment.merchant_country.toUpperCase();
      if (SANCTIONED_COUNTRIES.has(mc)) {
        ofac_status = 'match';
        matches.push(`merchant_country: ${mc} (OFAC sanctioned)`);
      }
    }

    // Screen merchant name — if it looks like a blockchain address, use address screening
    const merchantName = req.payment.merchant_name ?? req.payment.to_address;
    if (/^0x[a-fA-F0-9]{40}$/.test(merchantName)) {
      const addrResult = engine.screenAddress(merchantName);
      listsChecked = addrResult.listsChecked;
      totalDurationMs += addrResult.durationMs;
      if (addrResult.hit) {
        ofac_status = 'match';
        matches.push(`merchant_address: ${merchantName}`);
        entityId = addrResult.entity?.id ?? null;
        entityName = addrResult.entity?.name ?? null;
      }
    } else if (merchantName) {
      // Screen merchant name via entity fuzzy search
      const entityResult: EntityScreeningResponse = engine.screenEntity(merchantName);
      listsChecked = entityResult.listsChecked;
      totalDurationMs += entityResult.durationMs;
      if (entityResult.hit && entityResult.matches[0]) {
        ofac_status = entityResult.matches[0].similarity >= 0.9 ? 'match' : 'review_required';
        matches.push(`merchant_name: ${merchantName} (similarity: ${entityResult.matches[0].similarity})`);
        entityId = entityResult.matches[0].entityId;
        entityName = entityResult.matches[0].name;
      }
    }

    return {
      ofac_status,
      screened_at: new Date().toISOString(),
      screening_provider: 'kontext-screening-engine',
      matches,
      listsChecked: listsChecked.map(String),
      entityId,
      entityName,
      durationMs: totalDurationMs,
    };
  }

  // Stablecoin/fiat: screen from/to addresses via engine
  const fromResult = engine.screenAddress(req.payment.from_address);
  const toResult = engine.screenAddress(req.payment.to_address);

  const fromStatus = addressResponseToOfacStatus(fromResult);
  const toStatus = addressResponseToOfacStatus(toResult);

  const ofac_status: OfacStatus =
    fromStatus === 'match' || toStatus === 'match' ? 'match' :
    'clear';

  const matches: string[] = [];
  let entityId: string | null = null;
  let entityName: string | null = null;

  if (fromResult.hit) {
    matches.push(`from_address: ${req.payment.from_address}`);
    entityId = fromResult.entity?.id ?? null;
    entityName = fromResult.entity?.name ?? null;
  }
  if (toResult.hit) {
    matches.push(`to_address: ${req.payment.to_address}`);
    // Prefer to_address entity if from wasn't a hit
    if (!entityId) {
      entityId = toResult.entity?.id ?? null;
      entityName = toResult.entity?.name ?? null;
    }
  }

  return {
    ofac_status,
    screened_at: new Date().toISOString(),
    screening_provider: 'kontext-screening-engine',
    matches,
    listsChecked: fromResult.listsChecked.map(String),
    entityId,
    entityName,
    durationMs: fromResult.durationMs + toResult.durationMs,
  };
}

// ---------------------------------------------------------------------------
// Trust Scoring
// ---------------------------------------------------------------------------

async function computeTrustScore(
  db: PoolClient,
  orgId: string,
  req: IngestRequest,
  policy: PolicyResult,
  screening: ScreeningResult,
  policyInputs?: IngestPolicyInputs,
): Promise<TrustScore> {
  const reasons: string[] = [];
  let score = 50; // neutral baseline

  // +20: wallet is known to org
  if (policyInputs?.wallet_known) {
    score += 20;
    reasons.push('authorized agent wallet');
  } else {
    reasons.push('unknown wallet (-0, capped)');
  }

  // +15: counterparty is known
  if (policyInputs?.counterparty_known) {
    score += 15;
    reasons.push('known counterparty');
  }

  // +10: screening clear
  if (screening.ofac_status === 'clear') {
    score += 10;
    reasons.push('screening clear');
  } else if (screening.ofac_status === 'match') {
    score -= 40;
    reasons.push('OFAC match — score penalized');
  } else {
    score -= 10;
    reasons.push('screening requires review');
  }

  // +10: policy passed cleanly
  if (policy.decision === 'allow') {
    score += 10;
    reasons.push('all policy checks passed');
  } else if (policy.decision === 'warn') {
    score -= 5;
    reasons.push(`policy warnings: ${policy.warnings.join(', ')}`);
  } else {
    score -= 30;
    reasons.push(`policy violations: ${policy.violations.join(', ')}`);
  }

  // Historical factor: agent anomaly rate from recent events
  const historyResult = await db.query<{ avg_trust: string; event_count: string }>(
    `SELECT
       ROUND(AVG(trust_score))::text AS avg_trust,
       COUNT(*)::text AS event_count
     FROM verification_events
     WHERE org_id = $1
       AND agent_id = $2
       AND environment = $3
       AND created_at >= now() - interval '30 days'`,
    [orgId, req.agent_id, req.environment],
  ).catch(() => ({ rows: [{ avg_trust: null, event_count: '0' }] }));

  const row = historyResult.rows[0];
  const historicalAvg = row?.avg_trust ? parseInt(row.avg_trust, 10) : null;
  const eventCount = row?.event_count ? parseInt(row.event_count, 10) : 0;

  if (historicalAvg !== null && eventCount >= 5) {
    // Blend: 70% current signal, 30% historical
    score = Math.round(score * 0.7 + historicalAvg * 0.3);
    reasons.push(`historical avg ${historicalAvg} over ${eventCount} events`);
  }

  const clamped = Math.max(0, Math.min(100, score));

  const band: TrustBand =
    clamped >= 70 ? 'high' :
    clamped >= 40 ? 'medium' :
    'low';

  return { score: clamped, band, reasons };
}

// ---------------------------------------------------------------------------
// Coverage Detection
// ---------------------------------------------------------------------------

async function detectCoverage(
  db: PoolClient,
  orgId: string,
  req: IngestRequest,
): Promise<CoverageResult> {
  const walletRow = await db.query(
    `SELECT monitoring_status FROM wallet_registry
     WHERE org_id = $1 AND address = $2 AND chain = $3`,
    [orgId, req.payment.from_address.toLowerCase(), req.payment.chain],
  ).catch(() => ({ rows: [] }));

  const walletMonitored = walletRow.rows[0]?.monitoring_status === 'monitored';

  const chainListenerConfirmed = false;

  const coverageStatus: CoverageStatus =
    walletMonitored ? 'full' :
    walletRow.rows.length > 0 ? 'partial' :
    'none';

  return {
    source: 'sdk-wrap',
    wallet_monitored: walletMonitored,
    chain_listener_confirmed: chainListenerConfirmed,
    coverage_status: coverageStatus,
  };
}

// ---------------------------------------------------------------------------
// Intent Hash (patent-protected: US 12,463,819 B1)
// ---------------------------------------------------------------------------

function computeIntentHash(req: IngestRequest): {
  value: string;
  canonical_fields: string[];
} {
  const CANONICAL_FIELDS = [
    'agent_id',
    'workflow',
    'payment.amount',
    'payment.token',
    'payment.from_address',
    'payment.to_address',
    'intent.declared_purpose',
  ] as const;

  const fields: string[] = [...CANONICAL_FIELDS];
  if (req.payment.destination_country !== undefined) {
    fields.push('payment.destination_country');
  }

  const canonical: Record<string, string | undefined> = {
    agent_id: req.agent_id,
    workflow: req.workflow,
    'payment.amount': req.payment.amount,
    'payment.token': req.payment.token,
    'payment.from_address': req.payment.from_address.toLowerCase(),
    'payment.to_address': req.payment.to_address.toLowerCase(),
    'intent.declared_purpose': req.intent.declared_purpose ?? '',
  };

  if (req.payment.destination_country !== undefined) {
    canonical['payment.destination_country'] = req.payment.destination_country;
  }

  // Card-specific canonical fields
  if (req.payment.instrument?.instrument_id) {
    fields.push('payment.instrument_id');
    canonical['payment.instrument_id'] = req.payment.instrument.instrument_id;
  }
  if (req.payment.card_authorization_id) {
    fields.push('payment.card_authorization_id');
    canonical['payment.card_authorization_id'] = req.payment.card_authorization_id;
  }

  const sortedKeys = Object.keys(canonical).sort();
  const serialized = JSON.stringify(
    Object.fromEntries(sortedKeys.map((k) => [k, canonical[k]])),
  );

  const value = createHash('sha256').update(serialized).digest('hex');

  return { value, canonical_fields: fields };
}

// ---------------------------------------------------------------------------
// Rolling Digest Chain (patent-protected: US 12,463,819 B1)
// ---------------------------------------------------------------------------

const GENESIS_HASH = '0'.repeat(64);

function computeRecordHash(
  priorDigest: string,
  eventData: Record<string, unknown>,
  salt: string,
): string {
  const sortedKeys = Object.keys(eventData).sort();
  const serialized = JSON.stringify(
    Object.fromEntries(sortedKeys.map((k) => [k, eventData[k]])),
  );

  return createHash('sha256')
    .update(priorDigest)
    .update(serialized)
    .update(salt)
    .digest('hex');
}

function deriveSalt(): string {
  const hrtime = process.hrtime.bigint().toString();
  return createHash('sha256').update(hrtime).digest('hex');
}

async function computeTamperEvidence(
  db: PoolClient,
  orgId: string,
  eventCanonical: Record<string, unknown>,
): Promise<TamperEvidence> {
  const stateRow = await db.query<{
    terminal_digest: string;
    chain_length: string;
  }>(
    'SELECT terminal_digest, chain_length FROM digest_chain_state WHERE org_id = $1 FOR UPDATE',
    [orgId],
  );

  const priorDigest = stateRow.rows[0]?.terminal_digest ?? GENESIS_HASH;
  const chainIndex = stateRow.rows[0]
    ? parseInt(stateRow.rows[0].chain_length, 10)
    : 0;

  const salt = deriveSalt();
  const recordHash = computeRecordHash(priorDigest, eventCanonical, salt);

  return {
    record_hash: recordHash,
    previous_record_hash: priorDigest,
    chain_index: chainIndex,
  };
}

// ---------------------------------------------------------------------------
// Render Summary (pre-computed for fast drawer load)
// ---------------------------------------------------------------------------

function computeRenderSummary(
  req: IngestRequest,
  policy: PolicyResult,
  trust: TrustScore,
): { headline: string; subheadline: string; risk_label: string } {
  const amount = parseFloat(req.payment.amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const railLabel = req.payment.rail === 'card' ? 'card payment' : 'payout';

  const headline =
    policy.decision === 'block' ? `Blocked ${railLabel}` :
    policy.decision === 'warn'  ? `${railLabel.charAt(0).toUpperCase() + railLabel.slice(1)} with warnings` :
    `Verified ${railLabel}`;

  const destination = req.payment.merchant_country
    ? ` to ${req.payment.merchant_country}`
    : req.payment.destination_country
    ? ` to ${req.payment.destination_country}`
    : '';

  const merchantSuffix = req.payment.merchant_name ? ` at ${req.payment.merchant_name}` : '';

  const subheadline =
    `${req.payment.currency} ${amount} ${railLabel}${destination}${merchantSuffix} by ${req.agent_id}`;

  const risk_label =
    trust.band === 'high'   ? 'High trust' :
    trust.band === 'medium' ? 'Medium trust' :
    'Low trust';

  return { headline, subheadline, risk_label };
}

// ---------------------------------------------------------------------------
// Duplicate Detection
// ---------------------------------------------------------------------------

async function checkDuplicate(
  db: Pool,
  orgId: string,
  payment: IngestPayment,
): Promise<boolean> {
  // Card rail: dedup on card_authorization_id
  if (payment.rail === 'card' && payment.card_authorization_id) {
    const result = await db.query(
      `SELECT 1 FROM verification_events
       WHERE org_id = $1 AND payment_card_authorization_id = $2
       LIMIT 1`,
      [orgId, payment.card_authorization_id],
    );
    return result.rows.length > 0;
  }

  // Stablecoin/fiat: dedup on tx_hash + chain
  if (!payment.tx_hash) return false;

  const result = await db.query(
    `SELECT 1 FROM verification_events
     WHERE org_id = $1 AND payment_tx_hash = $2 AND payment_chain = $3
     LIMIT 1`,
    [orgId, payment.tx_hash, payment.chain],
  );

  return result.rows.length > 0;
}

// ---------------------------------------------------------------------------
// Main Ingestion Handler
// ---------------------------------------------------------------------------

export interface IngestResponse {
  event_id: string;
  evidence_bundle_id: string;
  status: EventStatus;
  trust_score: number;
  trust_band: TrustBand;
  policy_decision: PolicyDecision;
  ofac_status: OfacStatus;
  intent_hash: string;
  chain_index: number;
  created_at: string;
}

export async function handleIngest(
  db: Pool,
  orgId: string,
  rawBody: unknown,
  engine?: ScreeningEngine | null,
): Promise<IngestResponse> {

  // 1. Validate and strip forbidden fields
  const req = validateIngestRequest(rawBody);
  req.org_id = orgId;

  // 2. Duplicate detection — fast path before acquiring transaction client
  const isDuplicate = await checkDuplicate(db, orgId, req.payment);

  if (isDuplicate) {
    const dupKey = req.payment.rail === 'card'
      ? `card authorization ${req.payment.card_authorization_id}`
      : `transaction ${req.payment.tx_hash} on ${req.payment.chain}`;
    throw new ValidationError(
      'DUPLICATE_TX_HASH',
      `${dupKey} already ingested for this org`,
    );
  }

  // 3. Run policy + screening in parallel (both are read-only, safe to parallelize)
  const client = await db.connect();

  try {
    const [policy, screening] = await Promise.all([
      evaluatePolicy(client, orgId, req),
      runScreening(req, engine ?? null),
    ]);

    // 4. Compute trust score (depends on policy + screening results)
    const trust = await computeTrustScore(
      client, orgId, req, policy, screening, req.policy_inputs,
    );

    // 5. Coverage detection
    const coverage = await detectCoverage(client, orgId, req);

    // 6. Compute intent hash (patent-protected)
    const intentHash = computeIntentHash(req);

    // 7. Derive event status
    const status: EventStatus =
      policy.decision === 'block' ? 'blocked' :
      policy.decision === 'warn'  ? 'warning' :
      coverage.coverage_status !== 'full' ? 'unverified' :
      'verified';

    // 8. Pre-compute render summary
    const renderSummary = computeRenderSummary(req, policy, trust);

    // 9. Generate IDs
    const eventId = generateId('ver');
    const bundleId = generateId('evb');
    const intentId = generateId('int');
    const now = new Date().toISOString();

    // 10. Canonical event data for digest chain (deterministic subset)
    const eventCanonical: Record<string, unknown> = {
      event_id: eventId,
      org_id: orgId,
      workflow: req.workflow,
      agent_id: req.agent_id,
      payment_tx_hash: req.payment.tx_hash ?? null,
      payment_chain: req.payment.chain,
      payment_amount: req.payment.amount,
      payment_token: req.payment.token,
      payment_from_address: req.payment.from_address.toLowerCase(),
      payment_to_address: req.payment.to_address.toLowerCase(),
      intent_hash_value: intentHash.value,
      policy_decision: policy.decision,
      ofac_status: screening.ofac_status,
      trust_score: trust.score,
    };
    // Include instrument identity in canonical data when present
    if (req.payment.instrument?.instrument_id) {
      eventCanonical['instrument_id'] = req.payment.instrument.instrument_id;
    }
    if (req.payment.card_authorization_id) {
      eventCanonical['card_authorization_id'] = req.payment.card_authorization_id;
    }

    // 11. ATOMIC TRANSACTION — digest chain + event + bundle must succeed together
    let tamper: TamperEvidence;
    await client.query('BEGIN');

    try {
      // Compute tamper evidence INSIDE the transaction with FOR UPDATE lock
      tamper = await computeTamperEvidence(client, orgId, eventCanonical);

      // Insert verification_event
      await client.query(
        `INSERT INTO verification_events (
          event_id, org_id, environment, event_version,
          event_type, status, created_at, verified_at,
          workflow, agent_id, agent_type, actor_type,
          payment_tx_hash, payment_chain, payment_rail, payment_token,
          payment_amount, payment_currency, payment_usd_equivalent,
          payment_from_address, payment_to_address,
          payment_destination_country, payment_counterparty_id,
          intent_id, intent_type, intent_declared_purpose,
          intent_requested_by, intent_requested_at,
          policy_decision, policy_version, policy_violations,
          policy_warnings, applied_policy_ids,
          ofac_status, screened_at, screening_provider,
          trust_score, trust_band, trust_reasons,
          coverage_source, wallet_monitored,
          chain_listener_confirmed, coverage_status,
          evidence_bundle_id, team_tag, business_unit_tag,
          instrument_id, instrument_type, instrument_network,
          instrument_issuer, instrument_scope,
          payment_card_last4, payment_merchant_category_code,
          payment_merchant_name, payment_merchant_country,
          payment_three_d_secure, payment_card_authorization_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
          $24,$25,$26,$27,$28,$29,$30,$31,$32,$33,
          $34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,
          $47,$48,$49,$50,$51,$52,$53,$54,$55,$56,$57
        )`,
        [
          eventId, orgId, req.environment, '1.0',
          'payout.verification', status, now,
          status === 'verified' ? now : null,
          req.workflow, req.agent_id, req.agent_type ?? null, req.actor_type,
          req.payment.tx_hash ?? null, req.payment.chain, req.payment.rail, req.payment.token,
          parseFloat(req.payment.amount), req.payment.currency,
          parseFloat(req.payment.amount), // usd_equivalent: 1:1 for stablecoin in v1
          req.payment.from_address.toLowerCase(),
          req.payment.to_address.toLowerCase(),
          req.payment.destination_country ?? null,
          req.payment.counterparty_id ?? null,
          intentId, req.intent.intent_type, req.intent.declared_purpose ?? null,
          req.intent.requested_by, req.intent.requested_at,
          policy.decision, policy.policy_version, policy.violations,
          policy.warnings, policy.applied_policy_ids,
          screening.ofac_status, screening.screened_at, screening.screening_provider,
          trust.score, trust.band, trust.reasons,
          coverage.source, coverage.wallet_monitored,
          coverage.chain_listener_confirmed, coverage.coverage_status,
          bundleId,
          req.tenant_tags?.team ?? null,
          req.tenant_tags?.business_unit ?? null,
          // Instrument columns
          req.payment.instrument?.instrument_id ?? null,
          req.payment.instrument?.instrument_type ?? null,
          req.payment.instrument?.instrument_network ?? null,
          req.payment.instrument?.instrument_issuer ?? null,
          req.payment.instrument?.instrument_scope ? JSON.stringify(req.payment.instrument.instrument_scope) : null,
          // Card-specific columns
          req.payment.card_last4 ?? null,
          req.payment.merchant_category_code ?? null,
          req.payment.merchant_name ?? null,
          req.payment.merchant_country ?? null,
          req.payment.three_d_secure_status ?? null,
          req.payment.card_authorization_id ?? null,
        ],
      );

      // Build scope evaluation for evidence bundle (card rail only)
      const scopeEvaluation = req.payment.instrument?.instrument_scope
        ? JSON.stringify({
            within_scope: policy.violations.filter((v) => v.includes('instrument')).length === 0,
            violations: policy.violations.filter((v) => v.includes('instrument') || v.includes('scope') || v.includes('MCC')),
          })
        : null;

      // Insert evidence_bundle (write-once, immutable)
      await client.query(
        `INSERT INTO evidence_bundles (
          evidence_bundle_id, event_id, org_id,
          intent_hash_algorithm, intent_hash_value, intent_hash_canonical_fields,
          authorization_type, authorized, authorizer, authorization_scope, evaluated_at,
          policy_trace,
          screening_provider, screening_result, screened_entity, screening_screened_at,
          exec_tx_hash, exec_chain, exec_observed_onchain, exec_first_seen_at,
          exec_confirmation_status,
          record_hash, previous_record_hash, chain_index,
          render_headline, render_subheadline, render_risk_label,
          instrument_id, instrument_issuer,
          card_authorization_id, card_3ds_status,
          merchant_screened_name, scope_evaluation,
          screening_lists_checked, screening_list_version,
          screening_entity_id, screening_entity_name, screening_duration_ms,
          created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,
          $28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39
        )`,
        [
          bundleId, eventId, orgId,
          'sha256', intentHash.value, intentHash.canonical_fields,
          'policy-scoped-agent', policy.decision === 'allow', 'org-policy-engine',
          req.workflow, now,
          JSON.stringify({
            decision: policy.decision,
            rules_evaluated: policy.applied_policy_ids.length,
            passed_rules: policy.decision === 'allow' ? policy.applied_policy_ids : [],
            failed_rules: policy.violations,
            warning_rules: policy.warnings,
          }),
          screening.screening_provider, screening.ofac_status,
          req.payment.merchant_name ?? req.payment.to_address.toLowerCase(), screening.screened_at,
          req.payment.tx_hash ?? null, req.payment.chain,
          false, null, null, // chain confirmation: async, not available at ingest time
          tamper.record_hash, tamper.previous_record_hash, tamper.chain_index,
          renderSummary.headline, renderSummary.subheadline, renderSummary.risk_label,
          // Card/instrument evidence
          req.payment.instrument?.instrument_id ?? null,
          req.payment.instrument?.instrument_issuer ?? null,
          req.payment.card_authorization_id ?? null,
          req.payment.three_d_secure_status ?? null,
          req.payment.merchant_name ?? null,
          scopeEvaluation,
          // Screening metadata (from ScreeningEngine)
          screening.listsChecked.length > 0 ? screening.listsChecked : null,
          null, // screening_list_version: populated when engine exposes snapshot version
          screening.entityId,
          screening.entityName,
          screening.durationMs > 0 ? screening.durationMs : null,
          now,
        ],
      );

      // Update digest chain state (atomic with above inserts)
      await client.query(
        `INSERT INTO digest_chain_state (org_id, terminal_digest, chain_length, last_event_id, last_updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (org_id) DO UPDATE SET
           terminal_digest = EXCLUDED.terminal_digest,
           chain_length    = EXCLUDED.chain_length,
           last_event_id   = EXCLUDED.last_event_id,
           last_updated_at = EXCLUDED.last_updated_at`,
        [
          orgId,
          tamper.record_hash,
          tamper.chain_index + 1,
          eventId,
          now,
        ],
      );

      await client.query('COMMIT');

    } catch (err) {
      await client.query('ROLLBACK');
      throw Object.assign(
        new Error('CHAIN_STATE_ERROR: digest chain update failed — manual inspection required'),
        { code: 'CHAIN_STATE_ERROR', cause: err },
      );
    }

    return {
      event_id: eventId,
      evidence_bundle_id: bundleId,
      status,
      trust_score: trust.score,
      trust_band: trust.band,
      policy_decision: policy.decision,
      ofac_status: screening.ofac_status,
      intent_hash: intentHash.value,
      chain_index: tamper.chain_index,
      created_at: now,
    };

  } finally {
    client.release();
  }
}
