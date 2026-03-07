// ============================================================================
// Kontext SDK - Type Definitions (v1 — Payment Control Plane)
// ============================================================================
// Minimal types retained from v0.8 for digest chain and ERC-8021 compatibility.
// Full PaymentAttempt types live in @kontext/core.
// ============================================================================

/** Action log entry for digest chain computation */
export interface ActionLog {
  id: string;
  timestamp: string;
  projectId: string;
  agentId: string;
  sessionId?: string;
  correlationId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  digest?: string;
  priorDigest?: string;
}

/** ERC-8021 transaction attribution data */
export interface ERC8021Attribution {
  codes: string[];
  schemaId: number;
  rawSuffix: string;
}

/** ERC-8021 configuration */
export interface ERC8021Config {
  rpcUrl: string;
  registryAddress?: string;
}
