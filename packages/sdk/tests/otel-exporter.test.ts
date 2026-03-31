import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OTelExporter } from '../src/exporters/otel-exporter.js';
import type { ActionLog } from '../src/types.js';

function makeEvent(overrides?: Partial<ActionLog>): ActionLog {
  return {
    id: 'act_test_001',
    timestamp: new Date().toISOString(),
    projectId: 'test-project',
    agentId: 'agent-1',
    correlationId: 'corr_001',
    type: 'transaction',
    description: 'Test transaction',
    metadata: {
      chain: 'base',
      amount: '5000',
      compliant: true,
    },
    ...overrides,
  };
}

describe('OTelExporter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts config in constructor', () => {
    const exporter = new OTelExporter({
      serviceName: 'my-service',
      attributes: { 'deployment.env': 'staging' },
    });
    expect(exporter).toBeDefined();
  });

  it('uses default config when none provided', () => {
    const exporter = new OTelExporter();
    expect(exporter).toBeDefined();
  });

  it('export() does not throw when @opentelemetry/api is not available', async () => {
    // Simulate missing OTel by forcing resolved state with null
    const exporter = new OTelExporter();
    (exporter as any).otelApi = null;
    (exporter as any).resolved = true;

    const result = await exporter.export([makeEvent()]);
    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(0);
  });

  it('export() succeeds without throwing for any environment', async () => {
    // Uses whatever is actually installed (or not)
    const exporter = new OTelExporter();
    const result = await exporter.export([makeEvent()]);
    expect(result.success).toBe(true);
  });

  it('export() returns 0 for empty events when OTel is unavailable', async () => {
    const exporter = new OTelExporter();
    (exporter as any).otelApi = null;
    (exporter as any).resolved = true;

    const result = await exporter.export([]);
    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(0);
  });

  it('flush() resolves cleanly', async () => {
    const exporter = new OTelExporter();
    await expect(exporter.flush()).resolves.toBeUndefined();
  });

  it('shutdown() resolves cleanly', async () => {
    const exporter = new OTelExporter();
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });

  it('creates spans when @opentelemetry/api is available', async () => {
    const mockEnd = vi.fn();
    const mockStartSpan = vi.fn().mockReturnValue({ end: mockEnd });
    const mockGetTracer = vi.fn().mockReturnValue({ startSpan: mockStartSpan });

    const mockOtelApi = {
      trace: {
        getTracer: mockGetTracer,
      },
    };

    // Create exporter and inject the mock OTel API via the resolved cache
    const exporter = new OTelExporter({ serviceName: 'test-svc', attributes: { 'env': 'test' } });

    // Override the private resolveOtel by setting the internal state directly
    (exporter as any).otelApi = mockOtelApi;
    (exporter as any).resolved = true;

    const events = [
      makeEvent(),
      makeEvent({ id: 'act_test_002', type: 'log', metadata: {} }),
    ];

    const result = await exporter.export(events);

    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(2);
    expect(mockGetTracer).toHaveBeenCalledWith('test-svc');
    expect(mockStartSpan).toHaveBeenCalledTimes(2);

    // Verify first span has correct attributes
    const firstCallAttrs = mockStartSpan.mock.calls[0]?.[1]?.attributes;
    expect(firstCallAttrs?.['kontext.action.type']).toBe('transaction');
    expect(firstCallAttrs?.['kontext.agent.id']).toBe('agent-1');
    expect(firstCallAttrs?.['kontext.project.id']).toBe('test-project');
    expect(firstCallAttrs?.['kontext.chain']).toBe('base');
    expect(firstCallAttrs?.['kontext.amount']).toBe('5000');
    expect(firstCallAttrs?.['kontext.compliant']).toBe('true');
    expect(firstCallAttrs?.['env']).toBe('test');

    // Verify second span omits missing metadata fields
    const secondCallAttrs = mockStartSpan.mock.calls[1]?.[1]?.attributes;
    expect(secondCallAttrs?.['kontext.action.type']).toBe('log');
    expect(secondCallAttrs?.['kontext.chain']).toBeUndefined();
    expect(secondCallAttrs?.['kontext.amount']).toBeUndefined();

    // All spans ended
    expect(mockEnd).toHaveBeenCalledTimes(2);
  });
});
