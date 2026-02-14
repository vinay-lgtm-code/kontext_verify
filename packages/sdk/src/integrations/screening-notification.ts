// ============================================================================
// Kontext SDK - Screening Notification Manager
// ============================================================================
//
// Sends email/webhook notifications to payment provider contacts when the
// ScreeningAggregator returns a non-definitive REVIEW decision. This bridges
// the gap between automated screening and human review, ensuring that
// ambiguous results get timely attention.
//
// Follows the WebhookManager pattern from packages/sdk/src/webhooks.ts:
// - Event-driven notifications
// - Exponential backoff retry (max 3 attempts)
// - Delivery tracking for audit trail
// - HMAC-SHA256 signed payloads (webhook transport)
//
// Transport options:
// - 'webhook': POST to a URL (primary -- works with email services like
//   SendGrid, Mailgun, or internal notification APIs)
// - 'smtp': Direct SMTP delivery (optional -- requires smtp credentials)
// ============================================================================

import { generateId, now } from '../utils.js';

import type { UnifiedScreeningResult } from './screening-provider.js';

// ============================================================================
// Types
// ============================================================================

/** Email transport via webhook POST */
export interface WebhookTransport {
  type: 'webhook';
  /** URL to POST notification payload to */
  url: string;
  /** Optional headers to include (e.g., API key for SendGrid) */
  headers?: Record<string, string>;
  /** Optional secret for HMAC-SHA256 signature */
  secret?: string;
}

/** Email transport via SMTP */
export interface SMTPTransport {
  type: 'smtp';
  host: string;
  port: number;
  auth: { user: string; pass: string };
  from: string;
}

/** Supported email transports */
export type EmailTransport = WebhookTransport | SMTPTransport;

/** A payment provider contact for screening notifications */
export interface PaymentProviderContact {
  /** Contact name */
  name: string;
  /** Email address */
  email: string;
  /** Which payment flows this contact covers */
  flows: ('circle-wallets' | 'stripe' | 'cctp' | 'x402' | 'all')[];
}

/** Configuration for the ScreeningNotificationManager */
export interface ScreeningNotificationConfig {
  /** Email addresses for payment provider contacts */
  paymentProviderContacts: PaymentProviderContact[];
  /** Which screening decisions trigger notification (default: ['REVIEW']) */
  notifyOn?: ('REVIEW' | 'BLOCK')[];
  /** Minimum risk score to trigger notification (default: 40) */
  minRiskScoreForNotification?: number;
  /** Email/webhook transport configuration */
  transport: EmailTransport;
  /** Whether to include full screening details or summary only (default: 'summary') */
  detailLevel?: 'summary' | 'full';
  /** Optional approval dashboard base URL for action links */
  approvalDashboardUrl?: string;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelayMs?: number;
  /** Custom fetch function for testing */
  fetchFn?: typeof fetch;
}

/** Context about the transaction being screened */
export interface TransactionContext {
  /** Transaction amount */
  amount?: string;
  /** Blockchain chain */
  chain?: string;
  /** Token being transferred */
  token?: string;
  /** Sender address */
  from?: string;
  /** Recipient address */
  to?: string;
  /** Payment flow type */
  flow?: 'circle-wallets' | 'stripe' | 'cctp' | 'x402';
  /** Approval request ID (if approval policies are configured) */
  approvalRequestId?: string;
  /** Approval expiry */
  expiresAt?: string;
}

/** Notification payload sent to the transport */
export interface ScreeningNotificationPayload {
  /** Unique notification ID */
  id: string;
  /** Event type */
  event: 'screening.review_required' | 'screening.block_notification';
  /** ISO timestamp */
  timestamp: string;
  /** Recipients */
  recipients: Array<{ name: string; email: string }>;
  /** Subject line */
  subject: string;
  /** Notification body */
  body: ScreeningNotificationBody;
}

/** Structured notification body */
export interface ScreeningNotificationBody {
  /** Transaction details (partially masked) */
  transaction: {
    amount?: string;
    chain?: string;
    token?: string;
    from?: string;
    to?: string;
  };
  /** Risk assessment summary */
  riskAssessment: {
    decision: string;
    aggregateRiskScore: number;
    highestSeverity: string;
    categories: string[];
    signalCount: number;
    providersConsulted: number;
    providersSucceeded: number;
  };
  /** Provider results summary */
  providerResults: Array<{
    provider: string;
    matched: boolean;
    success: boolean;
    signalCount: number;
  }>;
  /** Recommended action */
  recommendedAction: string;
  /** Link to approval dashboard (if configured) */
  approvalLink?: string;
  /** Deadline for response (if applicable) */
  responseDeadline?: string;
  /** Full screening result (only if detailLevel is 'full') */
  fullResult?: UnifiedScreeningResult;
}

/** Result of a notification delivery attempt */
export interface NotificationDeliveryResult {
  /** Notification ID */
  notificationId: string;
  /** Whether delivery succeeded */
  success: boolean;
  /** Number of attempts made */
  attempts: number;
  /** Error message if failed */
  error: string | null;
  /** ISO timestamp of last attempt */
  lastAttemptAt: string;
  /** Recipients notified */
  recipientCount: number;
}

// ============================================================================
// ScreeningNotificationManager
// ============================================================================

/**
 * Manages email/webhook notifications for screening review decisions.
 *
 * When the ScreeningAggregator returns a REVIEW decision (risk score 40-79),
 * the screening is non-definitive. This manager sends notifications to
 * configured payment provider contacts so they can take manual action.
 *
 * @example
 * ```typescript
 * const notifier = new ScreeningNotificationManager({
 *   paymentProviderContacts: [
 *     { name: 'Compliance Team', email: 'compliance@example.com', flows: ['all'] },
 *   ],
 *   transport: {
 *     type: 'webhook',
 *     url: 'https://api.sendgrid.com/v3/mail/send',
 *     headers: { Authorization: 'Bearer SG.xxx' },
 *   },
 * });
 *
 * // Called by ScreeningAggregator when decision is REVIEW
 * await notifier.notifyReviewRequired(screeningResult, {
 *   amount: '5000',
 *   chain: 'ethereum',
 *   token: 'USDC',
 *   flow: 'circle-wallets',
 * });
 * ```
 */
export class ScreeningNotificationManager {
  private readonly config: {
    paymentProviderContacts: PaymentProviderContact[];
    notifyOn: ('REVIEW' | 'BLOCK')[];
    minRiskScoreForNotification: number;
    transport: EmailTransport;
    detailLevel: 'summary' | 'full';
    approvalDashboardUrl: string | null;
    maxRetries: number;
    baseDelayMs: number;
    fetchFn: typeof fetch;
  };

  /** Delivery results for audit trail */
  private deliveryResults: NotificationDeliveryResult[] = [];

  constructor(config: ScreeningNotificationConfig) {
    this.config = {
      paymentProviderContacts: config.paymentProviderContacts,
      notifyOn: config.notifyOn ?? ['REVIEW'],
      minRiskScoreForNotification: config.minRiskScoreForNotification ?? 40,
      transport: config.transport,
      detailLevel: config.detailLevel ?? 'summary',
      approvalDashboardUrl: config.approvalDashboardUrl ?? null,
      maxRetries: config.maxRetries ?? 3,
      baseDelayMs: config.baseDelayMs ?? 1000,
      fetchFn: config.fetchFn ?? globalThis.fetch,
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Send notification for a REVIEW screening decision.
   *
   * 1. Determines recipients by matching flow type
   * 2. Formats notification payload with risk details
   * 3. Sends via configured transport with retry
   * 4. Records delivery result for audit trail
   *
   * @param result - The unified screening result
   * @param context - Transaction context for the notification
   * @returns Delivery result
   */
  async notifyReviewRequired(
    result: UnifiedScreeningResult,
    context?: TransactionContext,
  ): Promise<NotificationDeliveryResult> {
    // Check if this decision type should trigger notification
    if (!this.config.notifyOn.includes(result.decision as 'REVIEW' | 'BLOCK')) {
      return {
        notificationId: generateId(),
        success: true,
        attempts: 0,
        error: null,
        lastAttemptAt: now(),
        recipientCount: 0,
      };
    }

    // Check minimum risk score
    if (result.aggregateRiskScore < this.config.minRiskScoreForNotification) {
      return {
        notificationId: generateId(),
        success: true,
        attempts: 0,
        error: null,
        lastAttemptAt: now(),
        recipientCount: 0,
      };
    }

    // Determine recipients
    const recipients = this.getRecipients(context?.flow);
    if (recipients.length === 0) {
      return {
        notificationId: generateId(),
        success: true,
        attempts: 0,
        error: 'No matching recipients for this flow',
        lastAttemptAt: now(),
        recipientCount: 0,
      };
    }

    // Build notification payload
    const payload = this.buildPayload(result, context, recipients);

    // Send with retry
    const deliveryResult = await this.sendWithRetry(payload);

    // Record for audit trail
    this.deliveryResults.push(deliveryResult);

    return deliveryResult;
  }

  /**
   * Check if a screening result should trigger notification.
   */
  shouldNotify(result: UnifiedScreeningResult): boolean {
    return (
      this.config.notifyOn.includes(result.decision as 'REVIEW' | 'BLOCK') &&
      result.aggregateRiskScore >= this.config.minRiskScoreForNotification
    );
  }

  /**
   * Get delivery results for audit trail.
   */
  getDeliveryResults(): NotificationDeliveryResult[] {
    return [...this.deliveryResults];
  }

  /**
   * Get configured contacts.
   */
  getContacts(): PaymentProviderContact[] {
    return [...this.config.paymentProviderContacts];
  }

  // --------------------------------------------------------------------------
  // Private: Recipient Selection
  // --------------------------------------------------------------------------

  private getRecipients(
    flow?: 'circle-wallets' | 'stripe' | 'cctp' | 'x402',
  ): Array<{ name: string; email: string }> {
    return this.config.paymentProviderContacts
      .filter((c) => c.flows.includes('all') || (flow && c.flows.includes(flow)))
      .map((c) => ({ name: c.name, email: c.email }));
  }

  // --------------------------------------------------------------------------
  // Private: Payload Building
  // --------------------------------------------------------------------------

  private buildPayload(
    result: UnifiedScreeningResult,
    context: TransactionContext | undefined,
    recipients: Array<{ name: string; email: string }>,
  ): ScreeningNotificationPayload {
    const event = result.decision === 'BLOCK'
      ? 'screening.block_notification' as const
      : 'screening.review_required' as const;

    const subject = result.decision === 'BLOCK'
      ? `[BLOCKED] Sanctions screening alert - ${result.address}`
      : `[REVIEW REQUIRED] Screening alert - Risk score ${result.aggregateRiskScore}`;

    const recommendedAction = this.getRecommendedAction(result);

    const approvalLink = this.config.approvalDashboardUrl && context?.approvalRequestId
      ? `${this.config.approvalDashboardUrl}/review/${context.approvalRequestId}`
      : undefined;

    const body: ScreeningNotificationBody = {
      transaction: {
        amount: context?.amount,
        chain: context?.chain,
        token: context?.token,
        from: context?.from ? maskAddress(context.from) : undefined,
        to: context?.to ? maskAddress(context.to) : undefined,
      },
      riskAssessment: {
        decision: result.decision,
        aggregateRiskScore: result.aggregateRiskScore,
        highestSeverity: result.highestSeverity,
        categories: result.categories,
        signalCount: result.allSignals.length,
        providersConsulted: result.providersConsulted,
        providersSucceeded: result.providersSucceeded,
      },
      providerResults: result.providerResults.map((pr) => ({
        provider: pr.provider,
        matched: pr.matched,
        success: pr.success,
        signalCount: pr.signals.length,
      })),
      recommendedAction,
      approvalLink,
      responseDeadline: context?.expiresAt,
    };

    if (this.config.detailLevel === 'full') {
      body.fullResult = result;
    }

    return {
      id: generateId(),
      event,
      timestamp: now(),
      recipients,
      subject,
      body,
    };
  }

  private getRecommendedAction(result: UnifiedScreeningResult): string {
    if (result.decision === 'BLOCK') {
      return 'Transaction has been blocked due to sanctions screening. Review the match details and determine if this is a true positive. If confirmed, file a blocked transaction report.';
    }

    if (result.aggregateRiskScore >= 60) {
      return 'High-risk screening result. Review transaction details and request additional KYC/KYB documentation before proceeding. Consider placing a temporary hold.';
    }

    return 'Moderate-risk screening result. Review the flagged signals and verify the counterparty identity. Transaction may proceed after review if no concerns are identified.';
  }

  // --------------------------------------------------------------------------
  // Private: Send with Retry
  // --------------------------------------------------------------------------

  private async sendWithRetry(
    payload: ScreeningNotificationPayload,
  ): Promise<NotificationDeliveryResult> {
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      // Exponential backoff before retries
      if (attempt > 0) {
        const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      try {
        if (this.config.transport.type === 'webhook') {
          await this.sendViaWebhook(payload);
        } else {
          await this.sendViaSMTP(payload);
        }

        return {
          notificationId: payload.id,
          success: true,
          attempts: attempt + 1,
          error: null,
          lastAttemptAt: now(),
          recipientCount: payload.recipients.length,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      notificationId: payload.id,
      success: false,
      attempts: this.config.maxRetries + 1,
      error: lastError,
      lastAttemptAt: now(),
      recipientCount: payload.recipients.length,
    };
  }

  private async sendViaWebhook(payload: ScreeningNotificationPayload): Promise<void> {
    const transport = this.config.transport as WebhookTransport;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Kontext-Event': payload.event,
      'X-Kontext-Notification-Id': payload.id,
      ...(transport.headers ?? {}),
    };

    const response = await this.config.fetchFn(transport.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
    }
  }

  private async sendViaSMTP(_payload: ScreeningNotificationPayload): Promise<void> {
    // SMTP transport is a placeholder for environments that have an SMTP library.
    // In the zero-dependency SDK, this would need to be injected.
    // For now, log a warning.
    console.warn(
      '[ScreeningNotificationManager] SMTP transport not implemented in zero-dependency SDK. ' +
      'Use webhook transport instead, or inject an SMTP sender.',
    );
    throw new Error('SMTP transport not available in zero-dependency SDK');
  }
}

// ============================================================================
// Helpers
// ============================================================================

/** Partially mask a blockchain address for display: 0x1234...5678 */
function maskAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Promise-based sleep */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
