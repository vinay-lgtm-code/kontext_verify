import type {
  AuthorizationCheck,
  AuthorizePaymentInput,
  EvaluatePolicyResult,
  PaymentPolicy,
  PaymentReceipt,
  PolicyViolation,
  RequiredAction,
  StageEvent,
  StoredReceipt,
} from './types.js';
import { isValidAddress, parseAmount, toDayKey } from './utils.js';

// Reused from kontext_verify OFAC screening constants (trimmed set for MVP).
const OFAC_SANCTIONED_ADDRESSES = new Set([
  '0x098b716b8aaf21512996dc57eb0615e2383e2f96',
  '0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b',
  '0x3cffd56b47b7b41c56258d9c7731abadc360e460',
  '0x53b6936513e738f44fb50d2b9476730c0ab3bfc1',
  '0x6f1ca141a28907f78ebaa64f83e4ae6038d3cbe7',
  '0xdcbefbbecce100cce9e4b153c4e15cb885643193',
]);

const BLOCKING_CODES = new Set([
  'UNSUPPORTED_CHAIN',
  'UNSUPPORTED_TOKEN',
  'INVALID_AMOUNT',
  'INVALID_SENDER',
  'INVALID_RECIPIENT',
  'MAX_TRANSACTION_EXCEEDED',
  'SANCTIONED_RECIPIENT',
  'SANCTIONED_SENDER',
  'BLOCKED_RECIPIENT',
  'BLOCKED_SENDER',
  'RECIPIENT_NOT_ALLOWED',
]);

const REVIEW_CODES = new Set([
  'REQUIRES_HUMAN_APPROVAL',
  'DAILY_LIMIT_EXCEEDED',
]);

const COLLECT_INFO_CODES = new Set([
  'MISSING_PAYMENT_TYPE',
  'MISSING_REQUIRED_METADATA',
]);

export function evaluatePolicy(
  input: AuthorizePaymentInput,
  policy: PaymentPolicy,
  historicalReceipts: StoredReceipt[],
  createdAt: string,
): EvaluatePolicyResult {
  const checksRun: AuthorizationCheck[] = [];
  const violations: PolicyViolation[] = [];

  const amount = parseAmount(input.amount);
  const maxAmount = parseAmount(policy.maxTransactionAmount);
  const dailyLimit = parseAmount(policy.dailyAggregateLimit);
  const reviewThreshold = policy.reviewThreshold ? parseAmount(policy.reviewThreshold) : undefined;

  check(
    checksRun,
    violations,
    'Base chain required',
    input.chain === 'base',
    'critical',
    'Only Base is supported in this MVP.',
    'UNSUPPORTED_CHAIN',
    'Only chain="base" is supported for authorizePayment().',
  );

  check(
    checksRun,
    violations,
    'USDC token required',
    input.token === 'USDC',
    'critical',
    'Only USDC is supported in this MVP.',
    'UNSUPPORTED_TOKEN',
    'Only token="USDC" is supported for authorizePayment().',
  );

  check(
    checksRun,
    violations,
    'Sender address format',
    isValidAddress(input.from),
    'high',
    'Sender must be a valid EVM address.',
    'INVALID_SENDER',
    'Sender address is not a valid 0x-prefixed EVM address.',
  );

  check(
    checksRun,
    violations,
    'Recipient address format',
    isValidAddress(input.to),
    'high',
    'Recipient must be a valid EVM address.',
    'INVALID_RECIPIENT',
    'Recipient address is not a valid 0x-prefixed EVM address.',
  );

  check(
    checksRun,
    violations,
    'Amount is valid',
    Number.isFinite(amount) && amount > 0,
    'high',
    'Amount must be a positive numeric string.',
    'INVALID_AMOUNT',
    'Amount must be a positive numeric string (for example "5000").',
  );

  check(
    checksRun,
    violations,
    'Max transaction amount',
    Number.isFinite(amount) && Number.isFinite(maxAmount) ? amount <= maxAmount : false,
    'high',
    `Amount must be <= ${policy.maxTransactionAmount} USDC.`,
    'MAX_TRANSACTION_EXCEEDED',
    `Amount ${input.amount} exceeds max transaction amount ${policy.maxTransactionAmount}.`,
  );

  const dayKey = toDayKey(createdAt);
  const todayTotal = historicalReceipts
    .filter((receipt) => toDayKey(receipt.createdAt) === dayKey && receipt.actorId === input.actorId)
    .reduce((sum, receipt) => sum + parseAmount(receipt.amount), 0);
  const projectedTotal = todayTotal + (Number.isFinite(amount) ? amount : 0);

  check(
    checksRun,
    violations,
    'Daily aggregate limit',
    Number.isFinite(dailyLimit) ? projectedTotal <= dailyLimit : false,
    'high',
    `Actor daily aggregate must be <= ${policy.dailyAggregateLimit} USDC.`,
    'DAILY_LIMIT_EXCEEDED',
    `Projected daily total ${projectedTotal.toFixed(2)} exceeds limit ${policy.dailyAggregateLimit}.`,
  );

  if (reviewThreshold !== undefined && Number.isFinite(reviewThreshold)) {
    check(
      checksRun,
      violations,
      'Human approval threshold',
      Number.isFinite(amount) ? amount < reviewThreshold : false,
      'medium',
      `Amounts >= ${policy.reviewThreshold} require human review.`,
      'REQUIRES_HUMAN_APPROVAL',
      `Amount ${input.amount} requires human approval (threshold ${policy.reviewThreshold}).`,
    );
  }

  if (policy.sanctionsEnabled) {
    const toLower = input.to.toLowerCase();
    const fromLower = input.from.toLowerCase();

    check(
      checksRun,
      violations,
      'Sanctions screening (recipient)',
      !OFAC_SANCTIONED_ADDRESSES.has(toLower),
      'critical',
      'Recipient is screened against blocked addresses.',
      'SANCTIONED_RECIPIENT',
      'Recipient address appears on sanctions screening list.',
    );

    check(
      checksRun,
      violations,
      'Sanctions screening (sender)',
      !OFAC_SANCTIONED_ADDRESSES.has(fromLower),
      'critical',
      'Sender is screened against blocked addresses.',
      'SANCTIONED_SENDER',
      'Sender address appears on sanctions screening list.',
    );
  }

  const blockedRecipients = new Set(policy.blockedRecipients.map((address) => address.toLowerCase()));
  const blockedSenders = new Set(policy.blockedSenders.map((address) => address.toLowerCase()));

  check(
    checksRun,
    violations,
    'Blocked recipient policy',
    !blockedRecipients.has(input.to.toLowerCase()),
    'high',
    'Recipient is not in the blocked recipient list.',
    'BLOCKED_RECIPIENT',
    'Recipient is explicitly blocked by policy.',
  );

  check(
    checksRun,
    violations,
    'Blocked sender policy',
    !blockedSenders.has(input.from.toLowerCase()),
    'high',
    'Sender is not in the blocked sender list.',
    'BLOCKED_SENDER',
    'Sender is explicitly blocked by policy.',
  );

  if (policy.allowedRecipients.length > 0) {
    const allowed = new Set(policy.allowedRecipients.map((address) => address.toLowerCase()));
    check(
      checksRun,
      violations,
      'Allowed recipient policy',
      allowed.has(input.to.toLowerCase()),
      'high',
      'Recipient must appear in allowedRecipients.',
      'RECIPIENT_NOT_ALLOWED',
      'Recipient is not in allowedRecipients policy.',
    );
  }

  const paymentTypeRaw = input.metadata?.paymentType;
  const paymentType = typeof paymentTypeRaw === 'string' ? paymentTypeRaw : undefined;

  if (!paymentType) {
    check(
      checksRun,
      violations,
      'Payment type metadata',
      false,
      'medium',
      'metadata.paymentType is required to apply payment presets.',
      'MISSING_PAYMENT_TYPE',
      'metadata.paymentType is required (payroll, remittance, invoicing, treasury, other).',
    );
  } else {
    const required = policy.requiredMetadataByPaymentType[paymentType as keyof typeof policy.requiredMetadataByPaymentType] ?? [];
    const missing = required.filter((field) => input.metadata?.[field] === undefined || input.metadata?.[field] === null || input.metadata?.[field] === '');

    check(
      checksRun,
      violations,
      `Required metadata for ${paymentType}`,
      missing.length === 0,
      'medium',
      required.length > 0
        ? `Required metadata fields: ${required.join(', ')}.`
        : 'No additional metadata required for this payment type.',
      'MISSING_REQUIRED_METADATA',
      missing.length > 0
        ? `Missing required metadata fields for ${paymentType}: ${missing.join(', ')}.`
        : '',
    );
  }

  const decision = deriveDecision(violations);

  return {
    decision,
    checksRun,
    violations,
    requiredActions: buildRequiredActions(violations),
  };
}

function deriveDecision(violations: PolicyViolation[]): EvaluatePolicyResult['decision'] {
  if (violations.some((violation) => BLOCKING_CODES.has(violation.code))) {
    return 'block';
  }

  if (violations.some((violation) => COLLECT_INFO_CODES.has(violation.code))) {
    return 'collect_info';
  }

  if (violations.some((violation) => REVIEW_CODES.has(violation.code))) {
    return 'review';
  }

  return 'allow';
}

function buildRequiredActions(violations: PolicyViolation[]): RequiredAction[] {
  const actions = new Map<string, RequiredAction>();

  for (const violation of violations) {
    const action = mapViolationToAction(violation);
    actions.set(action.code, action);
  }

  return [...actions.values()];
}

function mapViolationToAction(violation: PolicyViolation): RequiredAction {
  switch (violation.code) {
    case 'REQUIRES_HUMAN_APPROVAL':
      return {
        code: 'REQUEST_APPROVAL',
        message: 'Collect human approval before sending this payment.',
      };
    case 'DAILY_LIMIT_EXCEEDED':
      return {
        code: 'RAISE_DAILY_LIMIT_OR_SPLIT_PAYMENT',
        message: 'Increase daily policy limit or split payment across days.',
      };
    case 'MISSING_PAYMENT_TYPE':
    case 'MISSING_REQUIRED_METADATA':
      return {
        code: 'ADD_REQUIRED_METADATA',
        message: 'Attach required metadata fields for this payment type.',
      };
    case 'RECIPIENT_NOT_ALLOWED':
      return {
        code: 'UPDATE_ALLOWED_RECIPIENTS',
        message: 'Add recipient to allowedRecipients or use an approved recipient.',
      };
    case 'BLOCKED_RECIPIENT':
    case 'SANCTIONED_RECIPIENT':
      return {
        code: 'CHANGE_RECIPIENT',
        message: 'Do not send to this recipient. Use a different recipient.',
      };
    default:
      return {
        code: 'FIX_POLICY_VIOLATIONS',
        message: 'Resolve blocking policy violations before retrying this payment.',
      };
  }
}

/** Convert a PaymentReceipt into a StageEvent for the 'authorize' stage */
export function receiptToStageEvent(receipt: PaymentReceipt): StageEvent {
  return {
    stage: 'authorize',
    status: receipt.decision === 'allow' ? 'succeeded'
          : receipt.decision === 'block' ? 'failed'
          : receipt.decision === 'review' ? 'review'
          : 'collect_info',
    actorSide: 'internal',
    code: receipt.decision === 'allow' ? 'AUTHORIZED'
          : (receipt.violations[0]?.code ?? 'UNKNOWN'),
    message: receipt.decision === 'allow' ? 'Payment authorized'
          : (receipt.violations[0]?.message ?? 'Authorization failed'),
    timestamp: receipt.createdAt,
    payload: {
      receiptId: receipt.receiptId,
      decision: receipt.decision,
      checksRun: receipt.checksRun.length,
      violations: receipt.violations.length,
    },
  };
}

function check(
  checks: AuthorizationCheck[],
  violations: PolicyViolation[],
  name: string,
  passed: boolean,
  severity: AuthorizationCheck['severity'],
  description: string,
  violationCode: string,
  violationMessage: string,
): void {
  checks.push({
    name,
    passed,
    severity,
    description,
  });

  if (!passed && violationMessage) {
    violations.push({
      code: violationCode,
      message: violationMessage,
      severity,
    });
  }
}
