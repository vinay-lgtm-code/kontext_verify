import { CodeBlock } from "@/components/code-block";

const verifyCall = `const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xTreasury...C3',
  to: '0xVendor...D4',
  agentId: 'treasury-agent',
});`;

const verifyResponse = `{
  compliant: true,
  riskLevel: 'low',
  checks: [
    { name: 'OFAC Sanctions', passed: true },
    { name: 'Amount Threshold', passed: true },
  ],
  trustScore: { score: 92, level: 'high' },
  digestProof: { valid: true, chainLength: 42 },
}`;

export function HeroCodeSnippet() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CodeBlock code={verifyCall} filename="agent.ts" language="typescript" />
      <CodeBlock
        code={verifyResponse}
        filename="response"
        language="json"
      />
    </div>
  );
}
