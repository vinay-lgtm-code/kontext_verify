# kontext-sdk

Python client for the Kontext trust layer. Cryptographic verifiable intent for org-wide payments.

Thin HTTP client wrapping the [Kontext REST API](https://getkontext.com/docs). All compliance logic runs server-side -- this package provides typed Python bindings with sync and async support.

## Install

```bash
pip install kontext-sdk
```

## Quick start

```python
from kontext import Kontext

ctx = Kontext(api_key="sk_...", project_id="my-agent")

# Log a transaction
ctx.log_transaction(
    tx_hash="0xabc...",
    chain="base",
    amount="5000",
    token="USDC",
    from_address="0xsender...",
    to_address="0xrecipient...",
    agent_id="payment-agent",
)

ctx.flush()

# Trust score
trust = ctx.get_trust_score("payment-agent")
print(f"Trust: {trust.score}/100 ({trust.level})")
```

## Async

```python
from kontext import AsyncKontext

async with AsyncKontext(api_key="sk_...", project_id="my-agent") as ctx:
    await ctx.log(action="transfer", agent_id="agent-1")
    trust = await ctx.get_trust_score("agent-1")
```

## API

| Method | Description |
|--------|-------------|
| `log(action, agent_id, ...)` | Buffer an action log |
| `log_transaction(tx_hash, chain, ...)` | Buffer a transaction log |
| `flush()` | Send buffered actions to server |
| `create_task(description, agent_id, ...)` | Create human-in-the-loop task |
| `confirm_task(task_id, evidence)` | Confirm task with evidence |
| `get_trust_score(agent_id)` | Get agent trust score (0-100) |
| `export_audit(format)` | Export audit trail (JSON or CSV) |
| `evaluate_anomalies(amount, agent_id, ...)` | Evaluate for anomalies |
| `health()` | Check API health |

## TypeScript SDK

The full TypeScript SDK (`kontext-sdk` on npm) includes auto-instrumentation, pluggable sanctions screening, tamper-evident digest chains, and MCP server mode. See [getkontext.com/docs](https://getkontext.com/docs).

## License

MIT
