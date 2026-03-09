import type { PaymentAttempt, StageEvent } from '@kontext/core';

export type NotificationTrigger = 'block' | 'review' | 'recipient_not_credited' | 'refund_required';

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
}

export interface EmailConfig {
  recipients: string[];
}

export interface NotificationConfig {
  slack?: SlackConfig;
  email?: EmailConfig;
  triggers: NotificationTrigger[];
}

/** Determine if a stage event should trigger a notification */
export function shouldNotify(event: StageEvent, triggers: NotificationTrigger[]): NotificationTrigger | null {
  if (event.stage === 'authorize' && event.status === 'failed' && triggers.includes('block')) {
    return 'block';
  }
  if (event.status === 'review' && triggers.includes('review')) {
    return 'review';
  }
  if (event.stage === 'recipient_credit' && event.status === 'failed' && triggers.includes('recipient_not_credited')) {
    return 'recipient_not_credited';
  }
  if (event.stage === 'retry_or_refund' && triggers.includes('refund_required')) {
    return 'refund_required';
  }
  return null;
}

function formatSlackMessage(trigger: NotificationTrigger, attempt: PaymentAttempt, event: StageEvent): Record<string, unknown> {
  const icon = trigger === 'block' ? ':no_entry:' : trigger === 'review' ? ':eyes:' : trigger === 'recipient_not_credited' ? ':warning:' : ':leftwards_arrow_with_hook:';
  const title = trigger === 'block' ? 'Payment Blocked' : trigger === 'review' ? 'Review Required' : trigger === 'recipient_not_credited' ? 'Recipient Not Credited' : 'Refund Required';

  return {
    text: `${icon} ${title}: ${attempt.attemptId}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${icon} ${title}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Attempt:*\n\`${attempt.attemptId}\`` },
          { type: 'mrkdwn', text: `*Archetype:*\n${attempt.archetype}` },
          { type: 'mrkdwn', text: `*Chain:*\n${attempt.chain}` },
          { type: 'mrkdwn', text: `*Stage:*\n${event.stage}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Reason:* ${event.code} — ${event.message}` },
      },
    ],
  };
}

function formatEmailBody(trigger: NotificationTrigger, attempt: PaymentAttempt, event: StageEvent): { subject: string; body: string } {
  const title = trigger === 'block' ? 'Payment Blocked' : trigger === 'review' ? 'Review Required' : trigger === 'recipient_not_credited' ? 'Recipient Not Credited' : 'Refund Required';

  return {
    subject: `[Kontext] ${title}: ${attempt.attemptId}`,
    body: [
      `${title}`,
      '',
      `Attempt ID: ${attempt.attemptId}`,
      `Archetype: ${attempt.archetype}`,
      `Chain: ${attempt.chain}`,
      `Asset: ${attempt.settlementAsset}`,
      `Stage: ${event.stage}`,
      `Status: ${event.status}`,
      `Code: ${event.code}`,
      `Message: ${event.message}`,
      `Timestamp: ${event.timestamp}`,
      '',
      `Sender: ${JSON.stringify(attempt.senderRefs)}`,
      `Recipient: ${JSON.stringify(attempt.recipientRefs)}`,
    ].join('\n'),
  };
}

/** Send a Slack notification via incoming webhook */
export async function sendSlackNotification(
  config: SlackConfig,
  trigger: NotificationTrigger,
  attempt: PaymentAttempt,
  event: StageEvent,
): Promise<boolean> {
  const payload = formatSlackMessage(trigger, attempt, event);
  if (config.channel) {
    (payload as Record<string, unknown>)['channel'] = config.channel;
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    console.error(`[notifications] Slack delivery failed for ${attempt.attemptId}`);
    return false;
  }
}

/** Send an email notification (logs to console in dev, SMTP/SendGrid in prod) */
export async function sendEmailNotification(
  config: EmailConfig,
  trigger: NotificationTrigger,
  attempt: PaymentAttempt,
  event: StageEvent,
): Promise<boolean> {
  const { subject, body } = formatEmailBody(trigger, attempt, event);

  // In production, this would use SendGrid/Mailgun/GCP
  // For now, log the email content
  console.log(`[notifications] Email to ${config.recipients.join(', ')}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Body: ${body.slice(0, 200)}...`);

  // TODO: Wire up actual email transport
  // const sgMail = require('@sendgrid/mail');
  // await sgMail.send({ to: config.recipients, from: 'alerts@getkontext.com', subject, text: body });

  return true;
}

/** Fire all configured notifications for a stage event */
export async function fireNotifications(
  config: NotificationConfig,
  attempt: PaymentAttempt,
  event: StageEvent,
): Promise<{ triggered: boolean; trigger: NotificationTrigger | null; results: { slack?: boolean; email?: boolean } }> {
  const trigger = shouldNotify(event, config.triggers);
  if (!trigger) {
    return { triggered: false, trigger: null, results: {} };
  }

  const results: { slack?: boolean; email?: boolean } = {};

  if (config.slack) {
    results.slack = await sendSlackNotification(config.slack, trigger, attempt, event);
  }

  if (config.email) {
    results.email = await sendEmailNotification(config.email, trigger, attempt, event);
  }

  return { triggered: true, trigger, results };
}
