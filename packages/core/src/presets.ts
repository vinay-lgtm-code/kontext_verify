import type { PaymentPolicy, PaymentType } from './types.js';

export interface PresetDefinition {
  paymentType: PaymentType;
  label: string;
  description: string;
  policy: PaymentPolicy;
}

const basePolicy = {
  maxTransactionAmount: '25000',
  dailyAggregateLimit: '100000',
  reviewThreshold: '10000',
  sanctionsEnabled: true,
  blockedRecipients: [],
  blockedSenders: [],
  allowedRecipients: [],
} satisfies Omit<PaymentPolicy, 'requiredMetadataByPaymentType'>;

export const PAYMENT_PRESETS: Record<PaymentType, PresetDefinition> = {
  payroll: {
    paymentType: 'payroll',
    label: 'Payroll',
    description: 'Recurring employee payouts on Base USDC.',
    policy: {
      ...basePolicy,
      maxTransactionAmount: '15000',
      dailyAggregateLimit: '250000',
      reviewThreshold: '12000',
      requiredMetadataByPaymentType: {
        payroll: ['employeeId', 'payPeriod', 'country'],
      },
    },
  },
  remittance: {
    paymentType: 'remittance',
    label: 'Cross-border remittance',
    description: 'Consumer remittance rails with recipient guardrails.',
    policy: {
      ...basePolicy,
      maxTransactionAmount: '10000',
      dailyAggregateLimit: '100000',
      reviewThreshold: '5000',
      requiredMetadataByPaymentType: {
        remittance: ['recipientName', 'recipientCountry', 'purpose'],
      },
    },
  },
  invoicing: {
    paymentType: 'invoicing',
    label: 'B2B invoicing',
    description: 'Invoice settlement guardrails for supplier payments.',
    policy: {
      ...basePolicy,
      maxTransactionAmount: '20000',
      dailyAggregateLimit: '150000',
      reviewThreshold: '15000',
      requiredMetadataByPaymentType: {
        invoicing: ['invoiceId', 'vendorId', 'dueDate'],
      },
    },
  },
  treasury: {
    paymentType: 'treasury',
    label: 'Treasury / agentic payments',
    description: 'High-confidence treasury movement with review thresholds.',
    policy: {
      ...basePolicy,
      maxTransactionAmount: '25000',
      dailyAggregateLimit: '100000',
      reviewThreshold: '10000',
      requiredMetadataByPaymentType: {
        treasury: ['purpose', 'counterpartyType'],
      },
    },
  },
  other: {
    paymentType: 'other',
    label: 'Other',
    description: 'General Base USDC flows with default safety rails.',
    policy: {
      ...basePolicy,
      requiredMetadataByPaymentType: {},
    },
  },
};

export function getPreset(paymentType: PaymentType): PresetDefinition {
  return PAYMENT_PRESETS[paymentType];
}

export function mergeWithPreset(paymentType: PaymentType, overrides: Partial<PaymentPolicy>): PaymentPolicy {
  const preset = getPreset(paymentType).policy;
  return {
    ...preset,
    ...overrides,
    blockedRecipients: overrides.blockedRecipients ?? preset.blockedRecipients,
    blockedSenders: overrides.blockedSenders ?? preset.blockedSenders,
    allowedRecipients: overrides.allowedRecipients ?? preset.allowedRecipients,
    requiredMetadataByPaymentType:
      overrides.requiredMetadataByPaymentType ?? preset.requiredMetadataByPaymentType,
  };
}
