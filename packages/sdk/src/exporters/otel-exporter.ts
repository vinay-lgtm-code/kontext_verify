// ============================================================================
// Kontext SDK - OpenTelemetry Bridge Exporter
// ============================================================================
// Exports Kontext events as OpenTelemetry spans. Uses dynamic import() so
// @opentelemetry/api is optional -- if not installed, export() is a noop.

import type { ActionLog } from '../types.js';
import type { EventExporter, ExporterResult } from '../exporters.js';

/**
 * Configuration for the OpenTelemetry exporter.
 */
export interface OTelExporterConfig {
  /** OpenTelemetry service name. Defaults to 'kontext-sdk'. */
  serviceName?: string;
  /** Additional span attributes applied to every span. */
  attributes?: Record<string, string>;
}

/**
 * OpenTelemetry bridge exporter that creates a span per Kontext event.
 *
 * Requires `@opentelemetry/api` as an optional peer dependency.
 * If the package is not installed, all operations are silent noops.
 *
 * @example
 * ```typescript
 * import { Kontext, OTelExporter } from 'kontext-sdk';
 *
 * const ctx = Kontext.init({
 *   projectId: 'my-project',
 *   environment: 'production',
 *   exporter: new OTelExporter({ serviceName: 'payment-agent' }),
 * });
 * ```
 */
export class OTelExporter implements EventExporter {
  private readonly serviceName: string;
  private readonly attributes: Record<string, string>;
  private otelApi: any = null;
  private resolved = false;

  constructor(config?: OTelExporterConfig) {
    this.serviceName = config?.serviceName ?? 'kontext-sdk';
    this.attributes = config?.attributes ?? {};
  }

  /**
   * Lazily resolve @opentelemetry/api. Caches the result so the dynamic
   * import only runs once.
   */
  private async resolveOtel(): Promise<any> {
    if (this.resolved) return this.otelApi;
    this.resolved = true;
    try {
      this.otelApi = await import('@opentelemetry/api');
    } catch {
      // @opentelemetry/api not installed -- noop mode
      this.otelApi = null;
    }
    return this.otelApi;
  }

  async export(events: ActionLog[]): Promise<ExporterResult> {
    const api = await this.resolveOtel();
    if (!api) {
      return { success: true, exportedCount: 0 };
    }

    const tracer = api.trace.getTracer(this.serviceName);

    for (const event of events) {
      const span = tracer.startSpan(`kontext.${event.type}`, {
        attributes: {
          'kontext.action.type': event.type,
          'kontext.agent.id': event.agentId,
          'kontext.project.id': event.projectId,
          ...(event.metadata?.['chain'] != null
            ? { 'kontext.chain': String(event.metadata['chain']) }
            : {}),
          ...(event.metadata?.['amount'] != null
            ? { 'kontext.amount': String(event.metadata['amount']) }
            : {}),
          ...(event.metadata?.['compliant'] != null
            ? { 'kontext.compliant': String(event.metadata['compliant']) }
            : {}),
          ...this.attributes,
        },
      });
      span.end();
    }

    return { success: true, exportedCount: events.length };
  }

  async flush(): Promise<void> {
    // Spans are exported by the OTel SDK's own SpanProcessor/Exporter pipeline.
    // Nothing to flush here.
  }

  async shutdown(): Promise<void> {
    // No resources to release.
  }
}
