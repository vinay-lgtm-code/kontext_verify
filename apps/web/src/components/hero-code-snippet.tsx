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

export function HeroCodeSnippet() {
  return <CodeBlock code={verifyCall} filename="agent.ts" language="typescript" />;
}
