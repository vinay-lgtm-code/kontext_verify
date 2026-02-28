// ============================================================================
// kontext mcp — start MCP server mode for Claude Code / Cursor / Windsurf
// ============================================================================

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

export async function runMcp(): Promise<void> {
  // MCP SDK is an optional peer dependency — only loaded when `kontext mcp` is invoked
  let McpServer: any;
  let StdioServerTransport: any;

  try {
    // @ts-ignore — optional peer dependency, loaded only when `kontext mcp` is invoked
    const mcpSdk = await import('@modelcontextprotocol/sdk/server/index.js');
    McpServer = mcpSdk.McpServer;
    // @ts-ignore — optional peer dependency
    const mcpStdio = await import('@modelcontextprotocol/sdk/server/stdio.js');
    StdioServerTransport = mcpStdio.StdioServerTransport;
  } catch {
    process.stderr.write(
      'MCP mode requires @modelcontextprotocol/sdk. Install with:\n' +
      '  npm install @modelcontextprotocol/sdk\n',
    );
    process.exit(2);
  }

  const { Kontext, FileStorage, UsdcCompliance } = await import('kontext-sdk');

  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);
  const kontext = Kontext.init({
    projectId: 'cli',
    environment: 'production',
    storage,
  });

  await kontext.restore();

  const server = new McpServer({
    name: 'kontext',
    version: pkg.version,
  });

  // Tool: verify_transaction
  server.tool(
    'verify_transaction',
    'Run compliance checks on a stablecoin transaction, log it, and return digest proof',
    {
      txHash: { type: 'string', description: 'Transaction hash' },
      amount: { type: 'string', description: 'Amount in token units' },
      token: { type: 'string', description: 'Token symbol (USDC, USDT, DAI, EURC, USDP, USDG)' },
      from: { type: 'string', description: 'Sender address' },
      to: { type: 'string', description: 'Recipient address' },
      agentId: { type: 'string', description: 'Agent identifier' },
    },
    async (params: Record<string, string>) => {
      const result = await kontext.verify({
        txHash: params['txHash'] ?? '',
        chain: 'base',
        amount: params['amount'] ?? '0',
        token: (params['token'] as any) ?? 'USDC',
        from: params['from'] ?? '',
        to: params['to'] ?? '',
        agentId: params['agentId'] ?? 'mcp',
      });
      await kontext.flush();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Tool: check_sanctions
  server.tool(
    'check_sanctions',
    'Check if an address is on the OFAC SDN sanctions list',
    {
      address: { type: 'string', description: 'Ethereum address to check' },
    },
    async (params: Record<string, string>) => {
      const result = UsdcCompliance.checkSanctionsDetailed(params['address'] ?? '');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Tool: log_reasoning
  server.tool(
    'log_reasoning',
    'Log agent reasoning into the tamper-evident digest chain',
    {
      agentId: { type: 'string', description: 'Agent identifier' },
      reasoning: { type: 'string', description: 'Reasoning text' },
      action: { type: 'string', description: 'Action being taken' },
    },
    async (params: Record<string, string>) => {
      const entry = await kontext.logReasoning({
        agentId: params['agentId'] ?? 'mcp',
        action: params['action'] ?? 'mcp-reasoning',
        reasoning: params['reasoning'] ?? '',
      });
      await kontext.flush();
      return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
    },
  );

  // Tool: get_trust_score
  server.tool(
    'get_trust_score',
    'Get the trust score for an agent based on historical behavior',
    {
      agentId: { type: 'string', description: 'Agent identifier' },
    },
    async (params: Record<string, string>) => {
      const score = await kontext.getTrustScore(params['agentId'] ?? 'mcp');
      return { content: [{ type: 'text', text: JSON.stringify(score, null, 2) }] };
    },
  );

  // Tool: get_compliance_certificate
  server.tool(
    'get_compliance_certificate',
    'Generate a compliance certificate for an agent with digest chain proof',
    {
      agentId: { type: 'string', description: 'Agent identifier' },
    },
    async (params: Record<string, string>) => {
      const cert = await kontext.generateComplianceCertificate({
        agentId: params['agentId'] ?? 'mcp',
        includeReasoning: true,
      });
      return { content: [{ type: 'text', text: JSON.stringify(cert, null, 2) }] };
    },
  );

  // Tool: verify_audit_trail
  server.tool(
    'verify_audit_trail',
    'Verify the integrity of the tamper-evident digest chain',
    {},
    async () => {
      const verification = kontext.verifyDigestChain();
      const chain = kontext.exportDigestChain();
      const result = {
        valid: verification.valid,
        chainLength: chain.links.length,
        terminalDigest: chain.terminalDigest,
      };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
