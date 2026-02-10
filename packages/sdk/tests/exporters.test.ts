import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  Kontext,
  NoopExporter,
  ConsoleExporter,
  JsonFileExporter,
  HttpExporter,
  KontextCloudExporter,
  MultiExporter,
} from '../src/index.js';
import type { EventExporter, ExporterResult } from '../src/index.js';
import type { ActionLog } from '../src/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

function makeAction(overrides?: Partial<ActionLog>): ActionLog {
  return {
    id: 'act-' + Math.random().toString(36).slice(2, 8),
    timestamp: new Date().toISOString(),
    projectId: 'test-project',
    agentId: 'agent-1',
    correlationId: 'corr-1',
    type: 'test',
    description: 'Test action',
    metadata: {},
    ...overrides,
  };
}

// ============================================================================
// NoopExporter Tests
// ============================================================================

describe('NoopExporter', () => {
  it('should return success with 0 exported count', async () => {
    const exporter = new NoopExporter();
    const result = await exporter.export([makeAction()]);
    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(0);
  });

  it('should handle flush and shutdown gracefully', async () => {
    const exporter = new NoopExporter();
    await expect(exporter.flush()).resolves.toBeUndefined();
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });
});

// ============================================================================
// ConsoleExporter Tests
// ============================================================================

describe('ConsoleExporter', () => {
  it('should log events to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exporter = new ConsoleExporter();

    const action = makeAction();
    const result = await exporter.export([action]);

    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Kontext Export]'),
    );

    consoleSpy.mockRestore();
  });

  it('should use custom prefix', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exporter = new ConsoleExporter({ prefix: '[MyApp]' });

    await exporter.export([makeAction()]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[MyApp]'),
    );

    consoleSpy.mockRestore();
  });

  it('should handle multiple events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exporter = new ConsoleExporter();

    const result = await exporter.export([makeAction(), makeAction(), makeAction()]);

    expect(result.exportedCount).toBe(3);
    expect(consoleSpy).toHaveBeenCalledTimes(3);

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// JsonFileExporter Tests
// ============================================================================

describe('JsonFileExporter', () => {
  const testDir = path.join(process.cwd(), '.test-exports-' + Date.now());

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should write events to JSONL file', async () => {
    const exporter = new JsonFileExporter({ outputDir: testDir });

    const action = makeAction();
    const result = await exporter.export([action]);

    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(1);

    // File should be created
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(testDir, `events-${date}.jsonl`);
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.id).toBe(action.id);
  });

  it('should append to existing file', async () => {
    const exporter = new JsonFileExporter({ outputDir: testDir });

    await exporter.export([makeAction({ id: 'act-1' })]);
    await exporter.export([makeAction({ id: 'act-2' })]);

    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(testDir, `events-${date}.jsonl`);
    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).id).toBe('act-1');
    expect(JSON.parse(lines[1]!).id).toBe('act-2');
  });

  it('should buffer events when bufferSize > 1', async () => {
    const exporter = new JsonFileExporter({ outputDir: testDir, bufferSize: 3 });

    await exporter.export([makeAction({ id: 'act-1' })]);
    await exporter.export([makeAction({ id: 'act-2' })]);

    // Not yet flushed (buffer=3, only 2 events)
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(testDir, `events-${date}.jsonl`);
    expect(fs.existsSync(filePath)).toBe(false);

    // Third event triggers flush
    await exporter.export([makeAction({ id: 'act-3' })]);
    expect(fs.existsSync(filePath)).toBe(true);

    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(3);
  });

  it('should flush remaining buffer on shutdown', async () => {
    const exporter = new JsonFileExporter({ outputDir: testDir, bufferSize: 10 });

    await exporter.export([makeAction({ id: 'act-1' })]);

    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(testDir, `events-${date}.jsonl`);
    expect(fs.existsSync(filePath)).toBe(false);

    await exporter.shutdown();
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should expose output directory', () => {
    const exporter = new JsonFileExporter({ outputDir: testDir });
    expect(exporter.getOutputDir()).toBe(path.resolve(testDir));
  });
});

// ============================================================================
// HttpExporter Tests
// ============================================================================

describe('HttpExporter', () => {
  it('should send events to the configured endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('OK', { status: 200 }),
    );

    const exporter = new HttpExporter({
      endpoint: 'https://example.com/events',
      headers: { 'X-Custom': 'header' },
      batchSize: 1,
    });

    await exporter.export([makeAction()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('https://example.com/events');
    expect(call[1]!.method).toBe('POST');
    expect(call[1]!.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Custom': 'header',
      }),
    );

    fetchMock.mockRestore();
  });

  it('should buffer events until batch size', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('OK', { status: 200 }),
    );

    const exporter = new HttpExporter({
      endpoint: 'https://example.com/events',
      batchSize: 3,
    });

    await exporter.export([makeAction()]);
    await exporter.export([makeAction()]);
    expect(fetchMock).not.toHaveBeenCalled();

    await exporter.export([makeAction()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockRestore();
  });

  it('should flush remaining events on shutdown', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('OK', { status: 200 }),
    );

    const exporter = new HttpExporter({
      endpoint: 'https://example.com/events',
      batchSize: 100,
    });

    await exporter.export([makeAction()]);
    expect(fetchMock).not.toHaveBeenCalled();

    await exporter.shutdown();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockRestore();
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('Network error'),
    );

    const exporter = new HttpExporter({
      endpoint: 'https://example.com/events',
      batchSize: 1,
    });

    // Should not throw
    await expect(exporter.export([makeAction()])).resolves.toBeDefined();

    fetchMock.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// KontextCloudExporter Tests
// ============================================================================

describe('KontextCloudExporter', () => {
  it('should throw without API key', () => {
    expect(() => new KontextCloudExporter({
      apiKey: '',
      projectId: 'test',
    })).toThrow('API key');
  });

  it('should send events to Kontext Cloud API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('OK', { status: 200 }),
    );

    const exporter = new KontextCloudExporter({
      apiKey: 'sk_test_123',
      projectId: 'my-project',
      batchSize: 1,
    });

    await exporter.export([makeAction()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('https://api.getkontext.com/v1/ingest');
    expect(call[1]!.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer sk_test_123',
        'X-Project-Id': 'my-project',
      }),
    );

    fetchMock.mockRestore();
  });

  it('should use custom API URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('OK', { status: 200 }),
    );

    const exporter = new KontextCloudExporter({
      apiKey: 'sk_test_123',
      projectId: 'my-project',
      apiUrl: 'https://custom-api.example.com',
      batchSize: 1,
    });

    await exporter.export([makeAction()]);

    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://custom-api.example.com/v1/ingest',
    );

    fetchMock.mockRestore();
  });

  it('should retry on 5xx errors', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let attempts = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        return new Response('Server Error', { status: 500 });
      }
      return new Response('OK', { status: 200 });
    });

    const exporter = new KontextCloudExporter({
      apiKey: 'sk_test_123',
      projectId: 'my-project',
      batchSize: 1,
      retryAttempts: 3,
      retryDelayMs: 10,
    });

    await exporter.export([makeAction()]);

    expect(attempts).toBe(3);

    fetchMock.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should not retry on 4xx errors', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let attempts = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempts++;
      return new Response('Unauthorized', { status: 401 });
    });

    const exporter = new KontextCloudExporter({
      apiKey: 'sk_test_123',
      projectId: 'my-project',
      batchSize: 1,
      retryAttempts: 3,
      retryDelayMs: 10,
    });

    await exporter.export([makeAction()]);

    expect(attempts).toBe(1);

    fetchMock.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// MultiExporter Tests
// ============================================================================

describe('MultiExporter', () => {
  it('should fan out events to all child exporters', async () => {
    const results1: ActionLog[][] = [];
    const results2: ActionLog[][] = [];

    const exporter1: EventExporter = {
      export: async (events) => { results1.push(events); return { success: true, exportedCount: events.length }; },
      flush: async () => {},
      shutdown: async () => {},
    };

    const exporter2: EventExporter = {
      export: async (events) => { results2.push(events); return { success: true, exportedCount: events.length }; },
      flush: async () => {},
      shutdown: async () => {},
    };

    const multi = new MultiExporter([exporter1, exporter2]);
    const action = makeAction();
    const result = await multi.export([action]);

    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(1);
    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
    expect(results1[0]![0]!.id).toBe(action.id);
    expect(results2[0]![0]!.id).toBe(action.id);
  });

  it('should report failure if any child exporter fails', async () => {
    const good: EventExporter = {
      export: async (events) => ({ success: true, exportedCount: events.length }),
      flush: async () => {},
      shutdown: async () => {},
    };

    const bad: EventExporter = {
      export: async () => { throw new Error('boom'); },
      flush: async () => {},
      shutdown: async () => {},
    };

    const multi = new MultiExporter([good, bad]);
    const result = await multi.export([makeAction()]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('1/2 exporters failed');
  });

  it('should flush and shutdown all child exporters', async () => {
    let flushed1 = false;
    let flushed2 = false;
    let shutdown1 = false;
    let shutdown2 = false;

    const exporter1: EventExporter = {
      export: async (events) => ({ success: true, exportedCount: events.length }),
      flush: async () => { flushed1 = true; },
      shutdown: async () => { shutdown1 = true; },
    };

    const exporter2: EventExporter = {
      export: async (events) => ({ success: true, exportedCount: events.length }),
      flush: async () => { flushed2 = true; },
      shutdown: async () => { shutdown2 = true; },
    };

    const multi = new MultiExporter([exporter1, exporter2]);
    await multi.flush();
    expect(flushed1).toBe(true);
    expect(flushed2).toBe(true);

    await multi.shutdown();
    expect(shutdown1).toBe(true);
    expect(shutdown2).toBe(true);
  });
});

// ============================================================================
// Custom EventExporter Interface Tests
// ============================================================================

describe('Custom EventExporter', () => {
  it('should work with a custom exporter implementation', async () => {
    const collected: ActionLog[] = [];

    const customExporter: EventExporter = {
      async export(events) {
        collected.push(...events);
        return { success: true, exportedCount: events.length };
      },
      async flush() {},
      async shutdown() {},
    };

    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
      exporter: customExporter,
    });

    await kontext.log({
      type: 'test',
      description: 'Custom exporter test',
      agentId: 'agent-1',
    });

    // Give the fire-and-forget promise time to resolve
    await new Promise((r) => setTimeout(r, 50));

    expect(collected).toHaveLength(1);
    expect(collected[0]!.type).toBe('test');

    await kontext.destroy();
  });
});

// ============================================================================
// Kontext Client Exporter Integration Tests
// ============================================================================

describe('Kontext client with exporter', () => {
  it('should use NoopExporter by default', async () => {
    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
    });

    // Should not throw and work normally
    await kontext.log({
      type: 'test',
      description: 'Default exporter test',
      agentId: 'agent-1',
    });

    await kontext.destroy();
  });

  it('should export events on logTransaction', async () => {
    const collected: ActionLog[] = [];
    const exporter: EventExporter = {
      async export(events) { collected.push(...events); return { success: true, exportedCount: events.length }; },
      async flush() {},
      async shutdown() {},
    };

    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
      exporter,
    });

    await kontext.logTransaction({
      txHash: '0xabc123',
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0xSender',
      to: '0xReceiver',
      agentId: 'agent-1',
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(collected).toHaveLength(1);
    expect(collected[0]!.type).toBe('transaction');

    await kontext.destroy();
  });

  it('should flush exporter on client flush', async () => {
    let flushed = false;
    const exporter: EventExporter = {
      async export(events) { return { success: true, exportedCount: events.length }; },
      async flush() { flushed = true; },
      async shutdown() {},
    };

    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
      exporter,
    });

    await kontext.flush();
    expect(flushed).toBe(true);

    await kontext.destroy();
  });

  it('should shutdown exporter on client destroy', async () => {
    let shutdown = false;
    const exporter: EventExporter = {
      async export(events) { return { success: true, exportedCount: events.length }; },
      async flush() {},
      async shutdown() { shutdown = true; },
    };

    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
      exporter,
    });

    await kontext.destroy();
    expect(shutdown).toBe(true);
  });
});
