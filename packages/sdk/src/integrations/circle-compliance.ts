// ============================================================================
// Kontext SDK - Circle Compliance Engine Integration
// ============================================================================
// Enterprise plan-gated. Implements ScreeningProvider for use with
// ScreeningAggregator. Uses native fetch() — zero runtime dependencies.

import type {
  CircleComplianceConfig,
  CircleScreenAddressInput,
  CircleScreenTransactionInput,
  CircleScreeningResult,
  CircleComprehensiveRisk,
} from '../types.js';
import { KontextError, KontextErrorCode } from '../types.js';
import { generateId, now } from '../utils.js';
import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningContext,
  QueryType,
  SanctionsList,
} from './screening-provider.js';

const DEFAULT_BASE_URL = 'https://api.circle.com';
const REQUEST_TIMEOUT_MS = 10_000;

interface CircleApiResponse<T> {
  data: T;
}

interface CircleScreeningResponse {
  id: string;
  status: 'approved' | 'denied' | 'pending_review';
  riskScore: number;
  riskLevel: string;
  flags: string[];
  details: Record<string, unknown>;
  createdAt: string;
}

/**
 * CircleComplianceEngine wraps Circle's paid Compliance Engine API for
 * address and transaction screening.
 *
 * Also implements ScreeningProvider so it plugs into the ScreeningAggregator
 * alongside other providers (Chainalysis, OpenSanctions, OFAC SDN).
 *
 * Enterprise plan-gated — plan checks enforced at the Kontext client level.
 */
export class CircleComplianceEngine implements ScreeningProvider {
  readonly id = 'circle-compliance-engine';
  readonly name = 'Circle Compliance Engine';
  readonly lists: readonly SanctionsList[] = ['OFAC_SDN', 'CUSTOM'] as const;
  readonly requiresApiKey = true;
  readonly browserCompatible = false;
  readonly queryTypes: readonly QueryType[] = ['address'] as const;

  private readonly apiKey: string;
  private readonly entitySecret: string;
  private readonly baseUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kontext: any = null;

  constructor(config: CircleComplianceConfig) {
    if (!config.apiKey) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'Circle API key is required',
      );
    }
    if (!config.entitySecret) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'Circle entity secret is required',
      );
    }
    this.apiKey = config.apiKey;
    this.entitySecret = config.entitySecret;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  /** Link to Kontext instance for auto-compliance logging */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setKontext(kontext: any): void {
    this.kontext = kontext;
  }

  // --------------------------------------------------------------------------
  // ScreeningProvider interface
  // --------------------------------------------------------------------------

  isAvailable(): boolean {
    return true;
  }

  async screen(query: string, context?: ScreeningContext): Promise<ScreeningResult> {
    const start = Date.now();
    try {
      const result = await this.screenAddress({
        address: query.toLowerCase(),
        chain: context?.chain as any,
        agentId: context?.agentId as string | undefined,
      });

      return {
        providerId: this.id,
        hit: result.status === 'denied',
        matches: result.status === 'denied'
          ? [{
              list: 'OFAC_SDN' as SanctionsList,
              matchType: 'exact_address' as const,
              similarity: 1.0,
              matchedValue: query.toLowerCase(),
              entityStatus: 'active' as const,
              program: result.flags.join(', ') || undefined,
            }]
          : [],
        listsChecked: this.lists,
        entriesSearched: 0,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        providerId: this.id,
        hit: false,
        matches: [],
        listsChecked: this.lists,
        entriesSearched: 0,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // --------------------------------------------------------------------------
  // Circle Compliance Engine methods
  // --------------------------------------------------------------------------

  /** Screen an address via Circle Compliance Engine */
  async screenAddress(input: CircleScreenAddressInput): Promise<CircleScreeningResult> {
    const body = {
      address: input.address.toLowerCase(),
      blockchain: input.chain ?? undefined,
      idempotencyKey: generateId(),
    };

    const res = await this.request<CircleApiResponse<CircleScreeningResponse>>(
      'POST',
      '/v1/w3s/compliance/screenings/addresses',
      body,
    );

    const result = this.mapScreeningResponse(res.data);

    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: input.agentId ?? 'circle-compliance-engine',
        action: 'circle-screen-address',
        reasoning: `Circle CE address screening for ${input.address}: ${result.status} (risk: ${result.riskLevel})`,
        confidence: 1.0,
        context: { screeningId: result.id, status: result.status, riskScore: result.riskScore },
      });
    }

    return result;
  }

  /** Screen a transaction via Circle Compliance Engine */
  async screenTransaction(input: CircleScreenTransactionInput): Promise<CircleScreeningResult> {
    const body = {
      txHash: input.txHash,
      blockchain: input.chain,
      amount: input.amount,
      token: input.token,
      from: input.from?.toLowerCase(),
      to: input.to?.toLowerCase(),
      idempotencyKey: generateId(),
    };

    const res = await this.request<CircleApiResponse<CircleScreeningResponse>>(
      'POST',
      '/v1/w3s/compliance/screenings/transactions',
      body,
    );

    const result = this.mapScreeningResponse(res.data);

    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: input.agentId ?? 'circle-compliance-engine',
        action: 'circle-screen-transaction',
        reasoning: `Circle CE transaction screening for ${input.txHash}: ${result.status} (risk: ${result.riskLevel})`,
        confidence: 1.0,
        context: { screeningId: result.id, status: result.status, riskScore: result.riskScore },
      });
    }

    return result;
  }

  /** Get an existing screening result by ID */
  async getScreening(screeningId: string): Promise<CircleScreeningResult> {
    const res = await this.request<CircleApiResponse<CircleScreeningResponse>>(
      'GET',
      `/v1/w3s/compliance/screenings/${screeningId}`,
    );
    return this.mapScreeningResponse(res.data);
  }

  /** Run comprehensive risk assessment: address + transaction screening in parallel */
  async getComprehensiveRisk(input: CircleScreenTransactionInput): Promise<CircleComprehensiveRisk> {
    const [addressResult, txResult] = await Promise.all([
      input.to
        ? this.screenAddress({ address: input.to, chain: input.chain, agentId: input.agentId })
        : Promise.resolve(null),
      this.screenTransaction(input),
    ]);

    const maxScore = Math.max(
      addressResult?.riskScore ?? 0,
      txResult.riskScore,
    );

    const overallStatus = addressResult?.status === 'denied' || txResult.status === 'denied'
      ? 'denied' as const
      : addressResult?.status === 'pending_review' || txResult.status === 'pending_review'
        ? 'pending_review' as const
        : 'approved' as const;

    const overallRiskLevel = maxScore >= 80 ? 'critical' as const
      : maxScore >= 60 ? 'high' as const
      : maxScore >= 30 ? 'medium' as const
      : 'low' as const;

    const risk: CircleComprehensiveRisk = {
      addressScreening: addressResult,
      transactionScreening: txResult,
      overallStatus,
      overallRiskScore: maxScore,
      overallRiskLevel,
    };

    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: input.agentId ?? 'circle-compliance-engine',
        action: 'circle-comprehensive-risk',
        reasoning: `Circle CE comprehensive risk for tx ${input.txHash}: ${overallStatus} (score: ${maxScore}, level: ${overallRiskLevel})`,
        confidence: 1.0,
        context: {
          overallStatus,
          overallRiskScore: maxScore,
          addressStatus: addressResult?.status ?? 'skipped',
          transactionStatus: txResult.status,
        },
      });
    }

    return risk;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Entity-Secret': this.entitySecret,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new KontextError(
        KontextErrorCode.API_ERROR,
        `Circle Compliance API error ${res.status}: ${text}`,
      );
    }

    return res.json() as Promise<T>;
  }

  private mapScreeningResponse(data: CircleScreeningResponse): CircleScreeningResult {
    return {
      id: data.id,
      status: data.status,
      riskScore: data.riskScore,
      riskLevel: data.riskLevel as CircleScreeningResult['riskLevel'],
      flags: data.flags,
      details: data.details,
      screenedAt: data.createdAt ?? now(),
    };
  }
}
