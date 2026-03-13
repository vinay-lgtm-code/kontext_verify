import { CodeBlock } from "@/components/code-block";

const terminalCode = `$ npx kontext init
  ✓ Monitoring 0xTreasury...C3 on base, ethereum
  ✓ Tokens: USDC, USDT
  ✓ Created kontext.config.json`;

const wrapCode = `import { Kontext, withKontextCompliance } from 'kontext-sdk';

const kontext = Kontext.init();  // reads kontext.config.json
const client = withKontextCompliance(rawClient, kontext);
// Every stablecoin transfer now auto-logged with compliance proof`;

export function HeroCodeSnippet() {
  return (
    <div className="flex flex-col gap-3">
      <CodeBlock code={terminalCode} filename="terminal" language="bash" />
      <CodeBlock code={wrapCode} filename="agent.ts" language="typescript" />
    </div>
  );
}
