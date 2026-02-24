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

