# Kontext + Vercel AI SDK Template

**AI agent with built-in compliance audit trails -- deploy in 60 seconds.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvinay-lgtm-code%2Fkontext_verify%2Ftree%2Fmain%2Ftemplates%2Fvercel-ai-agent&env=OPENAI_API_KEY&envDescription=Your%20OpenAI%20API%20key%20for%20the%20AI%20agent&project-name=kontext-ai-agent&repository-name=kontext-ai-agent)

---

## What You Get

- **AI chat agent** powered by Vercel AI SDK + GPT-4o with streaming responses
- **Tamper-evident audit trail** -- every tool call and LLM request is hashed into a patented cryptographic digest chain
- **Financial tool compliance** -- USDC transfers, payments, and balance checks are automatically flagged and logged
- **Trust scoring** -- agent behavior is scored in real-time based on history, anomalies, and task completion
- **One-line integration** -- wrap any AI model with `createKontextAI()` and compliance logging is automatic
- **Zero infrastructure** -- runs entirely in local mode with no external services required

## Quick Start

### Option 1: Deploy to Vercel (recommended)

Click the "Deploy with Vercel" button above, add your `OPENAI_API_KEY`, and you're live.

### Option 2: Run locally

```bash
# Clone this template
npx degit vinay-lgtm-code/kontext_verify/templates/vercel-ai-agent kontext-ai-agent
cd kontext-ai-agent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting.

## How It Works

Kontext wraps your AI model at the middleware level. When you call `createKontextAI()`, it returns a model proxy that intercepts every `streamText()` and `generateText()` call. Each operation is automatically logged into a tamper-evident digest chain:

```
User message --> AI model --> Tool call (e.g. transfer_usdc)
                                |
                                v
                    Kontext middleware intercepts
                                |
                    +-----------+-----------+
                    |                       |
              Log to digest chain    Extract financial data
              (crypto-linked)        (amount, currency, etc.)
                    |                       |
                    v                       v
              Audit trail            Compliance check
              with terminal          and anomaly detection
              digest proof
```

Every entry in the chain is cryptographically linked to the previous one. Tampering with any entry invalidates the entire chain, providing a verifiable compliance record.

## Key Integration Point

The entire Kontext integration happens in `src/app/api/chat/route.ts`:

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createKontextAI } from 'kontext-sdk';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // One-line Kontext setup -- wraps the model with audit logging
  const { model, kontext } = createKontextAI(openai('gpt-4o'), {
    projectId: 'ai-agent',
    agentId: 'chat-agent',
    financialTools: ['transfer_usdc', 'send_payment', 'check_balance'],
    logToolArgs: true,
  });

  // Every tool call is now automatically logged with cryptographic digest chains
  const result = streamText({
    model,
    messages,
    tools: {
      transfer_usdc: { /* ... */ },
      send_payment:  { /* ... */ },
      check_balance: { /* ... */ },
    },
  });

  // Access the audit trail after the call
  // const chain = kontext.exportDigestChain();
  // console.log('Terminal digest:', kontext.getTerminalDigest());

  return result.toDataStreamResponse();
}
```

That's it. No decorators, no wrappers around individual tools, no manual logging calls. The middleware captures everything automatically.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `KONTEXT_PROJECT_ID` | No | Project identifier for audit logs (default: `ai-agent`) |
| `KONTEXT_ENVIRONMENT` | No | `development`, `staging`, or `production` (default: `development`) |

## Project Structure

```
src/
  app/
    layout.tsx          # Root layout with dark theme
    page.tsx            # Chat page with audit trail UI
    globals.css         # Tailwind + custom styles
    api/
      chat/
        route.ts        # <-- The key file: AI + Kontext integration
  components/
    chat.tsx            # Client-side chat component with useChat
```

## What Kontext Logs

For every AI interaction, Kontext automatically records:

| Event | What's Captured |
|---|---|
| `ai_stream_start` | Model ID, operation type |
| `ai_tool_call` | Tool name, arguments (if `logToolArgs: true`), duration |
| `ai_financial_tool_call` | Extracted amount, currency, tool name |
| `ai_stream_complete` | Duration, tool call count, model ID |

Each event is added to the digest chain with a cryptographic hash linking it to the previous entry.

## Links

- [getkontext.com](https://getkontext.com) -- Documentation and dashboard
- [kontext-sdk on npm](https://www.npmjs.com/package/kontext-sdk) -- Package registry
- [GitHub](https://github.com/vinay-lgtm-code/kontext_verify) -- Source code and issues
- [Vercel AI SDK](https://sdk.vercel.ai) -- The AI framework this template builds on

## License

MIT
