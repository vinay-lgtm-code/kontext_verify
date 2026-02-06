// ============================================================================
// Kontext SDK - Action Logger
// ============================================================================

import type {
  ActionLog,
  TransactionRecord,
  LogActionInput,
  LogTransactionInput,
  KontextConfig,
  Chain,
  Token,
} from './types.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { DigestChain } from './digest.js';
import { generateId, now, isValidAddress, isValidTxHash, parseAmount } from './utils.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ActionLogger handles structured logging of all agent actions.
 *
 * Supports two output modes:
 * - **Local mode** (no API key): Writes structured JSON logs to the local filesystem.
 * - **Cloud mode** (with API key): Batches and sends logs to the Kontext API.
 *
 * Logs include timestamps, agent IDs, correlation IDs, and arbitrary metadata
 * for full audit traceability.
 */
export class ActionLogger {
  private readonly config: KontextConfig;
  private readonly store: KontextStore;
  private readonly digestChain: DigestChain;
  private batch: ActionLog[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly isCloudMode: boolean;

  constructor(config: KontextConfig, store: KontextStore) {
    this.config = config;
    this.store = store;
    this.digestChain = new DigestChain();
    this.batchSize = config.batchSize ?? 50;
    this.flushIntervalMs = config.flushIntervalMs ?? 5000;
    this.isCloudMode = !!config.apiKey;

    // Start the periodic flush timer
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);

    // Prevent the timer from keeping the process alive
    if (this.flushTimer && typeof this.flushTimer === 'object' && 'unref' in this.flushTimer) {
      this.flushTimer.unref();
    }
  }

  /**
   * Log a generic agent action.
   *
   * @param input - Action details including type, description, agentId, and metadata
   * @returns The created ActionLog entry
   *
   * @example
   * ```typescript
   * const action = await logger.log({
   *   type: 'approval',
   *   description: 'Agent approved USDC spending',
   *   agentId: 'agent-1',
   *   metadata: { spender: '0x...', amount: '1000' },
   * });
   * ```
   */
  async log(input: LogActionInput): Promise<ActionLog> {
    const action: ActionLog = {
      id: generateId(),
      timestamp: now(),
      projectId: this.config.projectId,
      agentId: input.agentId,
      correlationId: input.correlationId ?? generateId(),
      type: input.type,
      description: input.description,
      metadata: input.metadata ?? {},
    };

    // Compute rolling SHA-256 digest
    const link = this.digestChain.append(action);
    action.digest = link.digest;
    action.priorDigest = link.priorDigest;

    this.store.addAction(action);
    this.batch.push(action);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }

    if (this.config.debug) {
      this.debugLog('Action logged', action);
    }

    return action;
  }

  /**
   * Log a cryptocurrency transaction with full chain details.
   *
   * @param input - Transaction details including txHash, chain, amount, token, from, to
   * @returns The created TransactionRecord
   *
   * @example
   * ```typescript
   * const tx = await logger.logTransaction({
   *   txHash: '0xabc123...',
   *   chain: 'base',
   *   amount: '100.00',
   *   token: 'USDC',
   *   from: '0xSender...',
   *   to: '0xReceiver...',
   *   agentId: 'payment-agent-1',
   * });
   * ```
   */
  async logTransaction(input: LogTransactionInput): Promise<TransactionRecord> {
    this.validateTransactionInput(input);

    const correlationId = input.correlationId ?? generateId();

    const record: TransactionRecord = {
      id: generateId(),
      timestamp: now(),
      projectId: this.config.projectId,
      agentId: input.agentId,
      correlationId,
      type: 'transaction',
      description: `${input.token} transfer of ${input.amount} on ${input.chain}`,
      metadata: {
        ...input.metadata,
      },
      txHash: input.txHash,
      chain: input.chain,
      amount: input.amount,
      token: input.token,
      from: input.from,
      to: input.to,
    };

    // Compute rolling SHA-256 digest
    const link = this.digestChain.append(record);
    record.digest = link.digest;
    record.priorDigest = link.priorDigest;

    this.store.addTransaction(record);
    this.store.addAction(record);
    this.batch.push(record);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }

    if (this.config.debug) {
      this.debugLog('Transaction logged', record);
    }

    return record;
  }

  /**
   * Flush the current batch of logs.
   * In local mode, writes to a JSON file.
   * In cloud mode, sends to the Kontext API.
   */
  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const toFlush = [...this.batch];
    this.batch = [];

    if (this.isCloudMode) {
      await this.flushToApi(toFlush);
    } else {
      this.flushToFile(toFlush);
    }
  }

  /**
   * Stop the logger and flush any remaining logs.
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  // --------------------------------------------------------------------------
  // Digest Chain Access
  // --------------------------------------------------------------------------

  /**
   * Get the terminal digest — the latest SHA-256 digest in the chain.
   * Can be embedded in outgoing messages as tamper-evident proof.
   */
  getTerminalDigest(): string {
    return this.digestChain.getTerminalDigest();
  }

  /**
   * Get the full digest chain for export or verification.
   */
  getDigestChain(): DigestChain {
    return this.digestChain;
  }

  /**
   * Verify the integrity of the digest chain against stored actions.
   */
  verifyChain(actions: ActionLog[]): ReturnType<DigestChain['verify']> {
    return this.digestChain.verify(actions);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private validateTransactionInput(input: LogTransactionInput): void {
    const amount = parseAmount(input.amount);
    if (isNaN(amount) || amount < 0) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Invalid transaction amount: ${input.amount}`,
        { field: 'amount', value: input.amount },
      );
    }

    if (!input.txHash || input.txHash.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'Transaction hash is required',
        { field: 'txHash' },
      );
    }

    if (!input.from || input.from.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'Sender address (from) is required',
        { field: 'from' },
      );
    }

    if (!input.to || input.to.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'Recipient address (to) is required',
        { field: 'to' },
      );
    }

    const validChains: Chain[] = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'arc', 'avalanche', 'solana'];
    if (!validChains.includes(input.chain)) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Invalid chain: ${input.chain}. Must be one of: ${validChains.join(', ')}`,
        { field: 'chain', value: input.chain },
      );
    }

    const validTokens: Token[] = ['USDC', 'USDT', 'DAI', 'EURC'];
    if (!validTokens.includes(input.token)) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Invalid token: ${input.token}. Must be one of: ${validTokens.join(', ')}`,
        { field: 'token', value: input.token },
      );
    }
  }

  private flushToFile(actions: ActionLog[]): void {
    const outputDir = this.config.localOutputDir ?? '.kontext';
    const logDir = path.join(outputDir, 'logs');

    try {
      fs.mkdirSync(logDir, { recursive: true });

      const filename = `actions-${new Date().toISOString().split('T')[0]}.jsonl`;
      const filePath = path.join(logDir, filename);

      const lines = actions.map((a) => JSON.stringify(a)).join('\n') + '\n';
      fs.appendFileSync(filePath, lines, 'utf-8');
    } catch (error) {
      if (this.config.debug) {
        this.debugLog('Failed to write log file', { error });
      }
    }
  }

  private async flushToApi(actions: ActionLog[]): Promise<void> {
    const apiUrl = this.config.apiUrl ?? 'https://api.kontext.dev';

    try {
      const response = await fetch(`${apiUrl}/v1/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Project-Id': this.config.projectId,
        },
        body: JSON.stringify({ actions }),
      });

      if (!response.ok) {
        throw new KontextError(
          KontextErrorCode.API_ERROR,
          `API request failed with status ${response.status}`,
          { status: response.status },
        );
      }
    } catch (error) {
      if (error instanceof KontextError) throw error;

      // On API failure, fall back to local file storage
      if (this.config.debug) {
        this.debugLog('API flush failed, falling back to local file', { error });
      }
      this.flushToFile(actions);
    }
  }

  private debugLog(message: string, data?: unknown): void {
    const timestamp = now();
    console.debug(`[Kontext ${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}
