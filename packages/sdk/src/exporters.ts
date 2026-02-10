// ============================================================================
// Kontext SDK - Pluggable Event Exporters
// ============================================================================
// Provides an EventExporter interface and built-in implementations for
// shipping events to external systems. Follows the OpenTelemetry exporter
// pattern: export() → flush() → shutdown().
//
// Built-in exporters:
//   NoopExporter          – Default, discards events (current SDK behavior)
//   ConsoleExporter       – Prints events to stdout
//   JsonFileExporter      – Writes events to JSONL files on disk
//   HttpExporter          – Sends batched events to any HTTP endpoint
//   KontextCloudExporter  – Ships events to api.getkontext.com (Pro/Enterprise)
//
// Developers can implement their own exporters by conforming to the
// EventExporter interface.

import type { ActionLog } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// EventExporter Interface
// ============================================================================

/**
 * Result of an export operation.
 */
export interface ExporterResult {
  /** Whether the export succeeded */
  success: boolean;
  /** Number of events exported */
  exportedCount: number;
  /** Error message if the export failed */
  error?: string;
}

/**
 * Interface for pluggable event exporters.
 * Implement this to ship Kontext events to any external system
 * (HTTP endpoint, message queue, cloud storage, etc.).
 *
 * Follows the OpenTelemetry SpanExporter pattern:
 * - `export()` receives a batch of events to export
 * - `flush()` forces any buffered events to be sent
 * - `shutdown()` performs cleanup and final flush
 *
 * @example
 * ```typescript
 * class DatadogExporter implements EventExporter {
 *   async export(events: ActionLog[]): Promise<ExporterResult> {
 *     await fetch('https://api.datadoghq.com/v1/input', {
 *       method: 'POST',
 *       headers: { 'DD-API-KEY': process.env.DD_API_KEY },
 *       body: JSON.stringify(events),
 *     });
 *     return { success: true, exportedCount: events.length };
 *   }
 *   async flush(): Promise<void> {}
 *   async shutdown(): Promise<void> {}
 * }
 * ```
 */
export interface EventExporter {
  /** Export a batch of action log events. */
  export(events: ActionLog[]): Promise<ExporterResult>;
  /** Force any buffered events to be sent immediately. */
  flush(): Promise<void>;
  /** Gracefully shut down the exporter, flushing remaining events. */
  shutdown(): Promise<void>;
}

// ============================================================================
// NoopExporter
// ============================================================================

/**
 * No-op exporter that discards all events.
 * This is the default exporter, preserving the SDK's original behavior
 * where events are only stored in-memory (or via StorageAdapter).
 */
export class NoopExporter implements EventExporter {
  async export(_events: ActionLog[]): Promise<ExporterResult> {
    return { success: true, exportedCount: 0 };
  }

  async flush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}

// ============================================================================
// ConsoleExporter
// ============================================================================

/**
 * Console exporter that prints events to stdout as JSON.
 * Useful for development and debugging.
 *
 * @example
 * ```typescript
 * const kontext = Kontext.init({
 *   projectId: 'my-project',
 *   environment: 'development',
 *   exporter: new ConsoleExporter(),
 * });
 * ```
 */
export class ConsoleExporter implements EventExporter {
  private readonly prefix: string;

  constructor(options?: { prefix?: string }) {
    this.prefix = options?.prefix ?? '[Kontext Export]';
  }

  async export(events: ActionLog[]): Promise<ExporterResult> {
    for (const event of events) {
      console.log(`${this.prefix} ${JSON.stringify(event)}`);
    }
    return { success: true, exportedCount: events.length };
  }

  async flush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}

// ============================================================================
// JsonFileExporter
// ============================================================================

/**
 * File-based exporter that writes events as JSONL (one JSON object per line).
 * Each day gets its own file: `events-2025-01-15.jsonl`.
 *
 * @example
 * ```typescript
 * const kontext = Kontext.init({
 *   projectId: 'my-project',
 *   environment: 'production',
 *   exporter: new JsonFileExporter({ outputDir: './audit-logs' }),
 * });
 * ```
 */
export class JsonFileExporter implements EventExporter {
  private readonly outputDir: string;
  private buffer: ActionLog[] = [];
  private readonly bufferSize: number;

  constructor(options?: { outputDir?: string; bufferSize?: number }) {
    this.outputDir = path.resolve(options?.outputDir ?? '.kontext/exports');
    this.bufferSize = options?.bufferSize ?? 1;
  }

  async export(events: ActionLog[]): Promise<ExporterResult> {
    this.buffer.push(...events);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    return { success: true, exportedCount: events.length };
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const toWrite = [...this.buffer];
    this.buffer = [];

    try {
      fs.mkdirSync(this.outputDir, { recursive: true });

      const date = new Date().toISOString().split('T')[0];
      const filePath = path.join(this.outputDir, `events-${date}.jsonl`);
      const lines = toWrite.map((e) => JSON.stringify(e)).join('\n') + '\n';
      fs.appendFileSync(filePath, lines, 'utf-8');
    } catch (error) {
      console.warn('[Kontext JsonFileExporter] Failed to write events:', error);
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }

  /** Get the output directory path. */
  getOutputDir(): string {
    return this.outputDir;
  }
}

// ============================================================================
// HttpExporter
// ============================================================================

/**
 * Generic HTTP exporter that sends batched events to any HTTP endpoint.
 * Events are buffered and sent in configurable batch sizes.
 *
 * @example
 * ```typescript
 * const kontext = Kontext.init({
 *   projectId: 'my-project',
 *   environment: 'production',
 *   exporter: new HttpExporter({
 *     endpoint: 'https://my-analytics.example.com/v1/events',
 *     headers: { 'Authorization': 'Bearer my-token' },
 *   }),
 * });
 * ```
 */
export class HttpExporter implements EventExporter {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly batchSize: number;
  private readonly timeoutMs: number;
  private buffer: ActionLog[] = [];

  constructor(options: {
    endpoint: string;
    headers?: Record<string, string>;
    batchSize?: number;
    timeoutMs?: number;
  }) {
    this.endpoint = options.endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    this.batchSize = options.batchSize ?? 50;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async export(events: ActionLog[]): Promise<ExporterResult> {
    this.buffer.push(...events);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }

    return { success: true, exportedCount: events.length };
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const toSend = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ events: toSend }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        console.warn(
          `[Kontext HttpExporter] Export failed with status ${response.status}`,
        );
      }
    } catch (error) {
      console.warn('[Kontext HttpExporter] Export failed:', error);
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }
}

// ============================================================================
// KontextCloudExporter
// ============================================================================

/**
 * Cloud exporter for Pro and Enterprise plans.
 * Ships events to the Kontext Cloud API (api.getkontext.com) with automatic
 * batching, retry, and GENIUS Act-compliant retention.
 *
 * Events sent via this exporter are stored in Kontext's GCP infrastructure
 * with configurable retention policies aligned with regulatory requirements:
 * - 5-year default retention (BSA/AML)
 * - WORM-compatible immutable storage (SEC 17a-4 / CFTC 1.31)
 * - US-based data residency (GCP us-central1)
 * - AES-256 encryption at rest, TLS 1.3 in transit
 *
 * @example
 * ```typescript
 * const kontext = Kontext.init({
 *   apiKey: 'sk_live_...',
 *   projectId: 'my-project',
 *   environment: 'production',
 *   plan: 'pro',
 *   exporter: new KontextCloudExporter({
 *     apiKey: 'sk_live_...',
 *     projectId: 'my-project',
 *   }),
 * });
 * ```
 */
export class KontextCloudExporter implements EventExporter {
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly apiUrl: string;
  private readonly batchSize: number;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;
  private buffer: ActionLog[] = [];

  constructor(options: {
    apiKey: string;
    projectId: string;
    apiUrl?: string;
    batchSize?: number;
    timeoutMs?: number;
    retryAttempts?: number;
    retryDelayMs?: number;
  }) {
    if (!options.apiKey) {
      throw new Error('KontextCloudExporter requires an API key (Pro or Enterprise plan)');
    }

    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.apiUrl = options.apiUrl ?? 'https://api.getkontext.com';
    this.batchSize = options.batchSize ?? 100;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.retryAttempts = options.retryAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1_000;
  }

  async export(events: ActionLog[]): Promise<ExporterResult> {
    this.buffer.push(...events);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }

    return { success: true, exportedCount: events.length };
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const toSend = [...this.buffer];
    this.buffer = [];

    let lastError: unknown;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.apiUrl}/v1/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'X-Project-Id': this.projectId,
            'X-SDK-Version': '0.1.0',
          },
          body: JSON.stringify({
            events: toSend,
            metadata: {
              exportedAt: new Date().toISOString(),
              batchSize: toSend.length,
            },
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.ok) {
          return;
        }

        // 4xx errors are not retryable
        if (response.status >= 400 && response.status < 500) {
          console.warn(
            `[Kontext Cloud] Export rejected (${response.status}): ${await response.text()}`,
          );
          return;
        }

        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }

      // Exponential backoff before retry
      if (attempt < this.retryAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelayMs * Math.pow(2, attempt)),
        );
      }
    }

    console.warn(
      `[Kontext Cloud] Export failed after ${this.retryAttempts} attempts:`,
      lastError,
    );
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }
}

// ============================================================================
// MultiExporter
// ============================================================================

/**
 * Composite exporter that fans out events to multiple exporters.
 * Useful for sending events to both local files and cloud simultaneously.
 *
 * @example
 * ```typescript
 * const kontext = Kontext.init({
 *   projectId: 'my-project',
 *   environment: 'production',
 *   exporter: new MultiExporter([
 *     new JsonFileExporter({ outputDir: './backup' }),
 *     new KontextCloudExporter({ apiKey: 'sk_live_...', projectId: 'my-project' }),
 *   ]),
 * });
 * ```
 */
export class MultiExporter implements EventExporter {
  private readonly exporters: EventExporter[];

  constructor(exporters: EventExporter[]) {
    this.exporters = exporters;
  }

  async export(events: ActionLog[]): Promise<ExporterResult> {
    const results = await Promise.allSettled(
      this.exporters.map((e) => e.export(events)),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      return {
        success: false,
        exportedCount: events.length,
        error: `${failures.length}/${this.exporters.length} exporters failed`,
      };
    }

    return { success: true, exportedCount: events.length };
  }

  async flush(): Promise<void> {
    await Promise.allSettled(this.exporters.map((e) => e.flush()));
  }

  async shutdown(): Promise<void> {
    await Promise.allSettled(this.exporters.map((e) => e.shutdown()));
  }
}
