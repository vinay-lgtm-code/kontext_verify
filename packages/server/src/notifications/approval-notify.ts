// ============================================================================
// Kontext Server — Approval Notification Service
// ============================================================================
// Sends email notifications to org users who have approve:tasks permission
// when a new approval chain is created. Uses Resend for email delivery.

import type { Pool } from 'pg';
import { ROLE_PERMISSIONS, type Role } from '../auth/rbac.js';

interface EventSummary {
  amount: string;
  token: string;
  chain: string;
  riskLevel: string;
}

/**
 * Notify all org users with approve:tasks permission about a new pending approval.
 * Skips silently if RESEND_API_KEY is not set.
 */
export async function notifyApprovers(
  pool: Pool,
  orgId: string,
  eventId: string,
  eventSummary: EventSummary,
): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) {
    console.warn('[Kontext Approvals] RESEND_API_KEY not set — skipping email notification');
    return;
  }

  // Find roles that have approve:tasks permission
  const approverRoles = (Object.entries(ROLE_PERMISSIONS) as Array<[Role, string[]]>)
    .filter(([, perms]) => perms.includes('approve:tasks'))
    .map(([role]) => role);

  if (approverRoles.length === 0) return;

  // Query org users with matching roles
  const placeholders = approverRoles.map((_, i) => `$${i + 2}`).join(', ');
  const { rows: users } = await pool.query<{ email: string; role: string }>(
    `SELECT email, role FROM org_users
     WHERE org_id = $1 AND role IN (${placeholders}) AND status = 'active'`,
    [orgId, ...approverRoles],
  );

  if (users.length === 0) return;

  const dashboardUrl = process.env['KONTEXT_APP_URL'] ?? 'https://getkontext.com';
  const approvalLink = `${dashboardUrl}/dashboard?tab=approvals&event=${eventId}`;

  const amountFormatted = parseFloat(eventSummary.amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Dynamically import Resend to avoid hard dependency if not installed
  let resendModule: typeof import('resend');
  try {
    resendModule = await import('resend');
  } catch {
    console.warn('[Kontext Approvals] resend package not installed — skipping email notification');
    return;
  }

  const resend = new resendModule.Resend(apiKey);

  const emailPromises = users.map((user) =>
    resend.emails.send({
      from: 'approvals@send.getkontext.com',
      to: user.email,
      subject: `Approval Required: ${eventSummary.token} ${amountFormatted} on ${eventSummary.chain}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="margin-bottom: 16px;">Approval Required</h2>
          <p>A verification event requires your approval:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0; font-weight: 600;">Amount</td>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0;">${eventSummary.token} ${amountFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0; font-weight: 600;">Chain</td>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0;">${eventSummary.chain}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0; font-weight: 600;">Risk Level</td>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: ${eventSummary.riskLevel === 'high' ? '#dc2626' : '#16a34a'};">${eventSummary.riskLevel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0; font-weight: 600;">Event ID</td>
              <td style="padding: 8px 12px; border: 1px solid #e0e0e0; font-family: monospace; font-size: 12px;">${eventId}</td>
            </tr>
          </table>
          <a href="${approvalLink}" style="display: inline-block; padding: 10px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; font-weight: 600;">
            Review in Dashboard
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #666;">
            You are receiving this because you have the approve:tasks permission in your organization.
          </p>
        </div>
      `,
    }).catch((err: unknown) => {
      console.warn(`[Kontext Approvals] Failed to send to ${user.email}:`, (err as Error).message);
    }),
  );

  await Promise.allSettled(emailPromises);
}
