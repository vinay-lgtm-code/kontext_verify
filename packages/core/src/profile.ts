import type {
  Archetype,
  Chain,
  PaymentPolicy,
  SettlementAsset,
} from './types.js';
import { PAYMENT_PRESETS } from './presets.js';

export type PolicyPosture = 'monitor' | 'enforce';

export interface WorkspaceProfile {
  version: number;
  workspaceId: string;
  name: string;
  archetypes: Archetype[];
  chains: Chain[];
  assets: SettlementAsset[];
  executionSurfaces: string[];
  policyPosture: PolicyPosture;
  policies: Partial<Record<Archetype, PaymentPolicy>>;
  retryDefaults: {
    maxRetries: number;
    backoffMs: number;
  };
  redactionPolicy: {
    redactAddresses: boolean;
    redactAmounts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const VALID_ARCHETYPES: readonly Archetype[] = ['payroll', 'remittance', 'invoicing', 'treasury', 'micropayments'];
const VALID_CHAINS: readonly Chain[] = ['base', 'ethereum', 'solana'];
export function validateWorkspaceProfile(input: unknown): WorkspaceProfile {
  if (!input || typeof input !== 'object') {
    throw new Error('WorkspaceProfile must be an object');
  }

  const profile = input as Record<string, unknown>;

  if (typeof profile['workspaceId'] !== 'string' || !profile['workspaceId']) {
    throw new Error('workspaceId is required');
  }
  if (typeof profile['name'] !== 'string' || !profile['name']) {
    throw new Error('name is required');
  }
  if (!Array.isArray(profile['archetypes']) || profile['archetypes'].length === 0) {
    throw new Error('at least one archetype is required');
  }
  for (const a of profile['archetypes'] as string[]) {
    if (!(VALID_ARCHETYPES as readonly string[]).includes(a)) {
      throw new Error(`invalid archetype: ${a}`);
    }
  }
  if (!Array.isArray(profile['chains']) || profile['chains'].length === 0) {
    throw new Error('at least one chain is required');
  }
  for (const c of profile['chains'] as string[]) {
    if (!(VALID_CHAINS as readonly string[]).includes(c)) {
      throw new Error(`invalid chain: ${c}`);
    }
  }

  return profile as unknown as WorkspaceProfile;
}

export function defaultWorkspaceProfile(
  workspaceId: string,
  name: string,
  archetypes: Archetype[],
): WorkspaceProfile {
  const now = new Date().toISOString();
  const policies: Partial<Record<Archetype, PaymentPolicy>> = {};

  for (const archetype of archetypes) {
    // Map micropayments to 'other' preset for policy defaults, then override
    const presetKey = archetype === 'micropayments' ? 'other' : archetype;
    const preset = PAYMENT_PRESETS[presetKey];
    if (preset) {
      policies[archetype] = { ...preset.policy };
    }
  }

  // Override micropayments preset with plan values if present
  if (archetypes.includes('micropayments') && policies['micropayments']) {
    policies['micropayments'] = {
      ...policies['micropayments'],
      maxTransactionAmount: '100',
      dailyAggregateLimit: '10000',
      reviewThreshold: undefined,
      requiredMetadataByPaymentType: {},
    };
  }

  return {
    version: 1,
    workspaceId,
    name,
    archetypes,
    chains: ['base'],
    assets: ['USDC'],
    executionSurfaces: ['sdk'],
    policyPosture: 'enforce',
    policies,
    retryDefaults: { maxRetries: 3, backoffMs: 1000 },
    redactionPolicy: { redactAddresses: false, redactAmounts: false },
    createdAt: now,
    updatedAt: now,
  };
}
