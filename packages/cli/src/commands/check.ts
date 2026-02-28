// ============================================================================
// kontext check — stateless OFAC + threshold compliance check
// ============================================================================

import { UsdcCompliance } from 'kontext-sdk';
import type { Token, Chain } from 'kontext-sdk';

interface CheckArgs {
  from: string;
  to?: string;
  amount: string;
  token: Token;
  json: boolean;
}

export function runCheck(args: CheckArgs): void {
  // Single address mode: screen one address against OFAC
  if (!args.to) {
    const sanctioned = UsdcCompliance.isSanctioned(args.from);
    const detailed = UsdcCompliance.checkSanctionsDetailed(args.from);

    if (args.json) {
      const output = {
        address: args.from,
        sanctioned,
        ...detailed,
      };
      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    } else {
      process.stdout.write(`Address:         ${args.from}\n`);
      process.stdout.write(`OFAC Sanctions:  ${sanctioned ? 'SANCTIONED' : 'CLEAR'}\n`);
    }

    if (sanctioned) {
      process.exit(1);
    }
    return;
  }

  // Two address mode: full compliance check (OFAC + thresholds)
  const result = UsdcCompliance.checkTransaction({
    txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    chain: 'base' as Chain,
    amount: args.amount,
    token: args.token,
    from: args.from,
    to: args.to,
    agentId: 'cli',
  });

  if (args.json) {
    const output = {
      compliant: result.compliant,
      riskLevel: result.riskLevel,
      checks: result.checks.map((c) => ({
        name: c.name,
        passed: c.passed,
        description: c.description,
        severity: c.severity,
      })),
      recommendations: result.recommendations,
    };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } else {
    const amount = parseFloat(args.amount);

    // OFAC sanctions
    const senderSanctioned = result.checks.find((c) => c.name === 'sanctions_sender');
    const recipientSanctioned = result.checks.find((c) => c.name === 'sanctions_recipient');
    const anySanctioned = (senderSanctioned && !senderSanctioned.passed) || (recipientSanctioned && !recipientSanctioned.passed);
    process.stdout.write(`OFAC Sanctions:  ${anySanctioned ? 'SANCTIONED' : 'CLEAR'}\n`);

    // Travel Rule / EDD threshold ($3,000)
    const eddTriggered = !isNaN(amount) && amount >= 3000;
    if (eddTriggered) {
      process.stdout.write(`Travel Rule:     TRIGGERED ($${amount.toLocaleString()} >= $3,000 EDD threshold)\n`);
    } else {
      process.stdout.write(`Travel Rule:     CLEAR ($${amount.toLocaleString()} < $3,000)\n`);
    }

    // CTR threshold ($10,000)
    const ctrTriggered = !isNaN(amount) && amount >= 10000;
    if (ctrTriggered) {
      process.stdout.write(`CTR Threshold:   TRIGGERED ($${amount.toLocaleString()} >= $10,000)\n`);
    } else {
      process.stdout.write(`CTR Threshold:   CLEAR ($${amount.toLocaleString()} < $10,000)\n`);
    }

    // Large TX alert ($50,000)
    const largeTriggered = !isNaN(amount) && amount >= 50000;
    if (largeTriggered) {
      process.stdout.write(`Large TX Alert:  TRIGGERED ($${amount.toLocaleString()} >= $50,000)\n`);
    } else {
      process.stdout.write(`Large TX Alert:  CLEAR ($${amount.toLocaleString()} < $50,000)\n`);
    }

    // Risk level
    process.stdout.write(`Risk Level:      ${result.riskLevel}\n`);
  }

  // Exit code: 0 = clear, 1 = compliance failure
  if (!result.compliant) {
    process.exit(1);
  }
}
