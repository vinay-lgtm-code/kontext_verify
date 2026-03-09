import { describe, it, expect } from 'vitest';
import { shouldNotify } from '../src/services/notifications.js';
import type { StageEvent, PaymentAttempt } from '@kontext/core';

describe('shouldNotify', () => {
  const allTriggers = ['block', 'review', 'recipient_not_credited', 'refund_required'] as const;

  it('returns block when authorize fails', () => {
    const event: StageEvent = {
      stage: 'authorize',
      status: 'failed',
      actorSide: 'internal',
      code: 'MAX_TRANSACTION_EXCEEDED',
      message: 'Amount exceeds limit',
      timestamp: new Date().toISOString(),
    };

    expect(shouldNotify(event, [...allTriggers])).toBe('block');
  });

  it('returns review when status is review', () => {
    const event: StageEvent = {
      stage: 'authorize',
      status: 'review',
      actorSide: 'internal',
      code: 'REQUIRES_HUMAN_APPROVAL',
      message: 'Amount requires review',
      timestamp: new Date().toISOString(),
    };

    expect(shouldNotify(event, [...allTriggers])).toBe('review');
  });

  it('returns recipient_not_credited when credit stage fails', () => {
    const event: StageEvent = {
      stage: 'recipient_credit',
      status: 'failed',
      actorSide: 'provider',
      code: 'CREDIT_FAILED',
      message: 'Recipient not credited',
      timestamp: new Date().toISOString(),
    };

    expect(shouldNotify(event, [...allTriggers])).toBe('recipient_not_credited');
  });

  it('returns refund_required on retry_or_refund stage', () => {
    const event: StageEvent = {
      stage: 'retry_or_refund',
      status: 'succeeded',
      actorSide: 'internal',
      code: 'REFUND_INITIATED',
      message: 'Refund initiated',
      timestamp: new Date().toISOString(),
    };

    expect(shouldNotify(event, [...allTriggers])).toBe('refund_required');
  });

  it('returns null for normal succeeded events', () => {
    const event: StageEvent = {
      stage: 'confirm',
      status: 'succeeded',
      actorSide: 'network',
      code: 'CONFIRMED',
      message: 'Confirmed on-chain',
      timestamp: new Date().toISOString(),
    };

    expect(shouldNotify(event, [...allTriggers])).toBeNull();
  });

  it('returns null when trigger is not configured', () => {
    const event: StageEvent = {
      stage: 'authorize',
      status: 'failed',
      actorSide: 'internal',
      code: 'BLOCKED',
      message: 'Blocked',
      timestamp: new Date().toISOString(),
    };

    // Only 'review' is configured, not 'block'
    expect(shouldNotify(event, ['review'])).toBeNull();
  });
});
