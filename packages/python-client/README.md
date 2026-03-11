# kontext

Proof of compliance Python client for AI agents making agentic stablecoin and fiat payments.

Thin HTTP client wrapping the [Kontext REST API](https://getkontext.com/docs). All compliance logic runs server-side in TypeScript — this package provides typed Python bindings with sync and async support.

## Install

```bash
pip install kontext
```

## Quick Start

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

# Flush to server
ctx.flush()

# Trust score
trust = ctx.get_trust_score("payment-agent")
print(f"Trust: {trust.score}/100 ({trust.level})")

# Human-in-the-loop
task = ctx.create_task(
    description="Approve $5K transfer",
    agent_id="payment-agent",
    required_evidence=["txHash"],
)
confirmed = ctx.confirm_task(task.id, evidence={"txHash": "0xabc..."})

# Audit export
audit = ctx.export_audit(format="json")
```

## Async

```python
from kontext import AsyncKontext

async with AsyncKontext(api_key="sk_...", project_id="my-agent") as ctx:
    await ctx.log(action="transfer", agent_id="agent-1")
    trust = await ctx.get_trust_score("agent-1")
```

## Context Manager

```python
with Kontext(api_key="sk_...", project_id="my-agent") as ctx:
    ctx.log(action="transfer", agent_id="agent-1")
# auto-flushes on exit
```

## API

| Method | Description |
|--------|-------------|
| `log(action, agent_id, ...)` | Buffer an action log |
| `log_transaction(tx_hash, chain, ...)` | Buffer a transaction log |
| `flush()` | Send buffered actions to server |
| `create_task(description, agent_id, ...)` | Create human-in-the-loop task |
| `get_task(task_id)` | Get task status |
| `confirm_task(task_id, evidence)` | Confirm task with evidence |
| `get_trust_score(agent_id)` | Get agent trust score (0-100) |
| `export_audit(format)` | Export audit trail (JSON or CSV) |
| `get_usage()` | Get usage and plan limits |
| `evaluate_anomalies(amount, agent_id, ...)` | Evaluate transaction for anomalies |
| `health()` | Check API health |

## License

MIT
