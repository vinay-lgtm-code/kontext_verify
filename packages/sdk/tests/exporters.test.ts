import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  Kontext,
  NoopExporter,
  ConsoleExporter,
  JsonFileExporter,
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
