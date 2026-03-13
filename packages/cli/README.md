# @kontext-sdk/cli

CLI for the Kontext trust layer. Cryptographic verifiable intent for org-wide payments.

## Install

```bash
npm install -g @kontext-sdk/cli
```

Or run directly with npx:

```bash
npx @kontext-sdk/cli init
```

## Commands

### `kontext init` -- project setup wizard

```bash
npx @kontext-sdk/cli init
```

Interactive wizard that captures your wallets, tokens, chains, and compliance mode. Generates `kontext.config.json` -- the SDK reads this automatically.

### `kontext verify` -- compliance check + audit log

```bash
npx @kontext-sdk/cli verify --tx 0xabc... --amount 5000 --token USDC \
  --from 0xAgent --to 0xMerchant --agent my-bot
```

### `kontext check` -- stateless OFAC + threshold check

```bash
npx @kontext-sdk/cli check 0xSender 0xReceiver --amount 5000 --token USDC
```

### `kontext reason` -- log agent reasoning

```bash
npx @kontext-sdk/cli reason "Price within budget. Recipient verified." --agent my-bot
```

### `kontext cert` -- export compliance certificate

```bash
npx @kontext-sdk/cli cert --agent my-bot --output cert.json
```

### `kontext audit` -- verify digest chain integrity

```bash
npx @kontext-sdk/cli audit --verify
```

### `kontext mcp` -- MCP server for AI coding tools

```bash
npx @kontext-sdk/cli mcp
```

Works with Claude Code, Cursor, and Windsurf.

```json
{
  "mcpServers": {
    "kontext": {
      "command": "npx",
      "args": ["-y", "@kontext-sdk/cli", "mcp"]
    }
  }
}
```

## Flags

- `--json` -- structured JSON output on any command
- `--amount <number>` -- transaction amount in token units
- `--token <symbol>` -- USDC, USDT, DAI, EURC

## License

MIT

---

Built by [Legaci Labs](https://www.getkontext.com)
