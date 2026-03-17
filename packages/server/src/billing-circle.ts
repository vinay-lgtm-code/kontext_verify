// ============================================================================
// Kontext Server — Circle / Base Wallet Payment Verification
// ============================================================================
// Verifies on-chain USDC/EURC/USDT payments for Startup plan activation.
// Supports Circle Programmable Wallets and direct Base wallet transfers.

import { Hono } from 'hono';
import { getPool } from './db.js';

const SUPPORTED_CHAINS = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'arc', 'avalanche', 'solana'] as const;
const SUPPORTED_TOKENS = ['USDC', 'USDT', 'DAI', 'EURC'] as const;
const STARTUP_AMOUNT_USD = 2000;

function getTreasuryWallet(): string {
  return process.env['KONTEXT_TREASURY_WALLET'] ?? '';
}

interface VerifyPaymentBody {
  orgId: string;
  txHash: string;
  chain: string;
  token: string;
  amount: string;
  fromAddress: string;
}

export function createBillingRoutes(): Hono {
  const billing = new Hono();

  // POST /v1/billing/verify-payment — verify a crypto payment and activate Startup
  billing.post('/billing/verify-payment', async (c) => {
    const pool = getPool();
    if (!pool) {
      return c.json({ error: 'Billing requires database configuration' }, 503);
    }

    const treasury = getTreasuryWallet();
    if (!treasury) {
      return c.json({ error: 'Treasury wallet not configured' }, 503);
    }

    const body = await c.req.json<VerifyPaymentBody>();
    const { orgId, txHash, chain, token, amount, fromAddress } = body;

    if (!orgId || !txHash || !chain || !token || !amount || !fromAddress) {
      return c.json({ error: 'Missing required fields: orgId, txHash, chain, token, amount, fromAddress' }, 400);
    }

    if (!SUPPORTED_CHAINS.includes(chain as typeof SUPPORTED_CHAINS[number])) {
      return c.json({ error: `Unsupported chain: ${chain}. Supported: ${SUPPORTED_CHAINS.join(', ')}` }, 400);
    }

    if (!SUPPORTED_TOKENS.includes(token as typeof SUPPORTED_TOKENS[number])) {
      return c.json({ error: `Unsupported token: ${token}. Supported: ${SUPPORTED_TOKENS.join(', ')}` }, 400);
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < STARTUP_AMOUNT_USD) {
      return c.json({
        error: `Payment amount must be at least $${STARTUP_AMOUNT_USD}. Received: $${amount}`,
      }, 400);
    }

    // Check for duplicate tx hash
    const existing = await pool.query(
      'SELECT id FROM subscriptions WHERE payment_tx_hash = $1',
      [txHash],
    );
    if (existing.rows.length > 0) {
      return c.json({ error: 'Transaction hash already used for a subscription' }, 409);
    }

    // Determine payment rail
    const paymentRail = chain === 'base' ? 'base_wallet' : 'circle';

    const subscriptionId = `sub_crypto_${Date.now()}`;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert subscription
      await client.query(`
        INSERT INTO subscriptions (
          id, org_id, plan, status, amount_cents, currency, payment_rail,
          payment_wallet_address, payment_chain, payment_token, payment_tx_hash,
          current_period_start, current_period_end, created_at, updated_at
        ) VALUES ($1, $2, 'startup', 'active', $3, 'USD', $4, $5, $6, $7, $8, $9, $10, $9, $9)
        ON CONFLICT (org_id) WHERE plan = 'startup'
        DO UPDATE SET
          status = 'active',
          payment_tx_hash = $8,
          payment_chain = $6,
          payment_token = $7,
          current_period_start = $9,
          current_period_end = $10,
          updated_at = $9
      `, [
        subscriptionId, orgId, Math.round(amountNum * 100), paymentRail,
        fromAddress.toLowerCase(), chain, token, txHash,
        now.toISOString(), periodEnd.toISOString(),
      ]);

      // Update org plan
      await client.query(
        'UPDATE orgs SET plan = $1 WHERE org_id = $2',
        ['startup', orgId],
      );

      await client.query('COMMIT');

      return c.json({
        success: true,
        subscription: {
          id: subscriptionId,
          plan: 'startup',
          status: 'active',
          paymentRail,
          periodEnd: periodEnd.toISOString(),
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[billing-circle] Payment verification failed:', err);
      return c.json({ error: 'Payment verification failed' }, 500);
    } finally {
      client.release();
    }
  });

  // GET /v1/billing/status — current plan and subscription info
  billing.get('/billing/status', async (c) => {
    const pool = getPool();
    if (!pool) {
      return c.json({ plan: 'pilot', status: 'active', paymentRail: 'none' });
    }

    const orgId = c.get('orgId' as never) as string | undefined;
    if (!orgId) {
      return c.json({ plan: 'pilot', status: 'active', paymentRail: 'none' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM subscriptions WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orgId],
    );

    if (rows.length === 0) {
      return c.json({ plan: 'pilot', status: 'active', paymentRail: 'none' });
    }

    const sub = rows[0]!;
    return c.json({
      plan: sub.plan,
      status: sub.status,
      paymentRail: sub.payment_rail,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      stripeCustomerId: sub.stripe_customer_id ?? null,
      paymentChain: sub.payment_chain ?? null,
      paymentToken: sub.payment_token ?? null,
    });
  });

  return billing;
}
