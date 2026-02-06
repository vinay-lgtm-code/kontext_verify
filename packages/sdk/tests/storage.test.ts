import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryStorage, FileStorage, Kontext } from '../src/index.js';
import type { StorageAdapter } from '../src/index.js';
import { KontextStore } from '../src/store.js';

// ============================================================================
// MemoryStorage Tests
// ============================================================================

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('should save and load data', async () => {
    await storage.save('key1', { hello: 'world' });
    const result = await storage.load('key1');
    expect(result).toEqual({ hello: 'world' });
  });

  it('should return null for missing keys', async () => {
    const result = await storage.load('nonexistent');
    expect(result).toBeNull();
  });

  it('should overwrite existing keys', async () => {
    await storage.save('key1', { v: 1 });
    await storage.save('key1', { v: 2 });
    const result = await storage.load('key1');
    expect(result).toEqual({ v: 2 });
  });

  it('should delete data', async () => {
    await storage.save('key1', 'data');
    await storage.delete('key1');
    const result = await storage.load('key1');
    expect(result).toBeNull();
  });

  it('should delete non-existent keys without error', async () => {
    await expect(storage.delete('nonexistent')).resolves.toBeUndefined();
  });

  it('should list all keys', async () => {
    await storage.save('actions:1', {});
    await storage.save('actions:2', {});
    await storage.save('tasks:1', {});
    const keys = await storage.list();
    expect(keys).toHaveLength(3);
    expect(keys).toContain('actions:1');
    expect(keys).toContain('actions:2');
    expect(keys).toContain('tasks:1');
  });

  it('should list keys by prefix', async () => {
    await storage.save('actions:1', {});
    await storage.save('actions:2', {});
    await storage.save('tasks:1', {});
    const keys = await storage.list('actions');
    expect(keys).toHaveLength(2);
    expect(keys).toContain('actions:1');
    expect(keys).toContain('actions:2');
  });

  it('should return empty list when no keys match prefix', async () => {
    await storage.save('actions:1', {});
    const keys = await storage.list('nonexistent');
    expect(keys).toHaveLength(0);
  });

  it('should store deep copies (not references)', async () => {
    const original = { nested: { value: 1 } };
    await storage.save('key1', original);
    original.nested.value = 999;
    const loaded = await storage.load('key1');
    expect(loaded.nested.value).toBe(1);
  });

  it('should clear all data', async () => {
    await storage.save('key1', 'a');
    await storage.save('key2', 'b');
    storage.clear();
    const keys = await storage.list();
    expect(keys).toHaveLength(0);
  });

  it('should handle arrays', async () => {
    const arr = [1, 2, 3, { nested: true }];
    await storage.save('arr', arr);
    const result = await storage.load('arr');
    expect(result).toEqual(arr);
  });

  it('should handle primitive values', async () => {
    await storage.save('str', 'hello');
    await storage.save('num', 42);
    await storage.save('bool', true);
    expect(await storage.load('str')).toBe('hello');
    expect(await storage.load('num')).toBe(42);
    expect(await storage.load('bool')).toBe(true);
  });
});

// ============================================================================
// FileStorage Tests
// ============================================================================

describe('FileStorage', () => {
  const testDir = path.join(process.cwd(), '.test-storage-' + Date.now());
  let storage: FileStorage;

  beforeEach(() => {
    storage = new FileStorage(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should save and load data', async () => {
    await storage.save('test-key', { hello: 'world' });
    const result = await storage.load('test-key');
    expect(result).toEqual({ hello: 'world' });
  });

  it('should create the directory if it does not exist', async () => {
    expect(fs.existsSync(testDir)).toBe(false);
    await storage.save('key', { data: true });
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('should return null for missing keys', async () => {
    const result = await storage.load('nonexistent');
    expect(result).toBeNull();
  });

  it('should overwrite existing keys', async () => {
    await storage.save('key', { version: 1 });
    await storage.save('key', { version: 2 });
    const result = await storage.load('key');
    expect(result).toEqual({ version: 2 });
  });

  it('should delete files', async () => {
    await storage.save('key', 'data');
    await storage.delete('key');
    const result = await storage.load('key');
    expect(result).toBeNull();
  });

  it('should delete non-existent keys without error', async () => {
    await expect(storage.delete('nonexistent')).resolves.toBeUndefined();
  });

  it('should list all keys', async () => {
    await storage.save('actions', []);
    await storage.save('tasks', []);
    const keys = await storage.list();
    expect(keys).toHaveLength(2);
    expect(keys).toContain('actions');
    expect(keys).toContain('tasks');
  });

  it('should list keys by prefix', async () => {
    await storage.save('kontext:actions', []);
    await storage.save('kontext:tasks', []);
    await storage.save('other:stuff', []);
    const keys = await storage.list('kontext');
    expect(keys).toHaveLength(2);
  });

  it('should return empty list for empty directory', async () => {
    const keys = await storage.list();
    expect(keys).toHaveLength(0);
  });

  it('should handle arrays with complex objects', async () => {
    const data = [
      { id: '1', name: 'action', metadata: { nested: true } },
      { id: '2', name: 'tx', metadata: { amount: '100' } },
    ];
    await storage.save('complex', data);
    const result = await storage.load('complex');
    expect(result).toEqual(data);
  });

  it('should persist data across instances', async () => {
    await storage.save('persist-test', { persistent: true });

    // Create a new FileStorage instance pointing to the same directory
    const storage2 = new FileStorage(testDir);
    const result = await storage2.load('persist-test');
    expect(result).toEqual({ persistent: true });
  });

  it('should expose the base directory', () => {
    expect(storage.getBaseDir()).toBe(path.resolve(testDir));
  });
});

// ============================================================================
// KontextStore Persistence Integration Tests
// ============================================================================

describe('KontextStore persistence', () => {
  it('should flush and restore actions', async () => {
    const adapter = new MemoryStorage();
    const store = new KontextStore();
    store.setStorageAdapter(adapter);

    store.addAction({
      id: 'act-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      projectId: 'test',
      agentId: 'agent-1',
      correlationId: 'corr-1',
      type: 'transfer',
      description: 'Test action',
      metadata: {},
    });

    await store.flush();

    // Create a new store and restore
    const store2 = new KontextStore();
    store2.setStorageAdapter(adapter);
    await store2.restore();

    const actions = store2.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0]!.id).toBe('act-1');
  });

  it('should flush and restore tasks', async () => {
    const adapter = new MemoryStorage();
    const store = new KontextStore();
    store.setStorageAdapter(adapter);

    store.addTask({
      id: 'task-1',
      projectId: 'test',
      description: 'Test task',
      agentId: 'agent-1',
      status: 'pending',
      requiredEvidence: ['txHash'],
      providedEvidence: null,
      correlationId: 'corr-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      confirmedAt: null,
      expiresAt: null,
      metadata: {},
    });

    await store.flush();

    const store2 = new KontextStore();
    store2.setStorageAdapter(adapter);
    await store2.restore();

    const task = store2.getTask('task-1');
    expect(task).toBeDefined();
    expect(task!.description).toBe('Test task');
  });

  it('should be a no-op when no adapter is attached', async () => {
    const store = new KontextStore();
    // These should not throw
    await store.flush();
    await store.restore();
    expect(store.getCounts().actions).toBe(0);
  });

  it('should return the attached storage adapter', () => {
    const adapter = new MemoryStorage();
    const store = new KontextStore();
    expect(store.getStorageAdapter()).toBeNull();
    store.setStorageAdapter(adapter);
    expect(store.getStorageAdapter()).toBe(adapter);
  });
});

// ============================================================================
// Kontext Client Storage Integration Tests
// ============================================================================

describe('Kontext client with storage', () => {
  it('should accept a storage adapter in config', async () => {
    const storage = new MemoryStorage();
    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
      storage,
    });

    await kontext.log({
      type: 'test',
      description: 'Test action',
      agentId: 'agent-1',
    });

    // Flush persists data
    await kontext.flush();

    // Verify data was persisted to the adapter
    const keys = await storage.list();
    expect(keys.length).toBeGreaterThan(0);

    await kontext.destroy();
  });

  it('should restore state from storage', async () => {
    const storage = new MemoryStorage();

    // Pre-populate storage with action data
    await storage.save('kontext:actions', [
      {
        id: 'restored-action',
        timestamp: '2026-01-01T00:00:00.000Z',
        projectId: 'test-project',
        agentId: 'agent-1',
        correlationId: 'corr-1',
        type: 'transfer',
        description: 'Restored action',
        metadata: {},
      },
    ]);
    await storage.save('kontext:transactions', []);
    await storage.save('kontext:tasks', []);
    await storage.save('kontext:anomalies', []);

    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
      storage,
    });

    await kontext.restore();

    // The exported data should contain the restored action
    const exportResult = await kontext.export({ format: 'json' });
    const parsed = JSON.parse(exportResult.data);
    expect(parsed.actions).toHaveLength(1);
    expect(parsed.actions[0].id).toBe('restored-action');

    await kontext.destroy();
  });

  it('should work without a storage adapter (backward compatible)', async () => {
    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
    });

    await kontext.log({
      type: 'test',
      description: 'Test',
      agentId: 'agent-1',
    });

    // flush/restore are no-ops
    await kontext.flush();
    await kontext.restore();

    await kontext.destroy();
  });
});

// ============================================================================
// Custom StorageAdapter Interface Tests
// ============================================================================

describe('Custom StorageAdapter', () => {
  it('should work with a custom adapter implementation', async () => {
    // Simple custom adapter backed by a plain object
    const backingStore: Record<string, string> = {};

    const customAdapter: StorageAdapter = {
      async save(key: string, data: any): Promise<void> {
        backingStore[key] = JSON.stringify(data);
      },
      async load(key: string): Promise<any | null> {
        const raw = backingStore[key];
        return raw ? JSON.parse(raw) : null;
      },
      async delete(key: string): Promise<void> {
        delete backingStore[key];
      },
      async list(prefix?: string): Promise<string[]> {
        const keys = Object.keys(backingStore);
        return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
      },
    };

    const store = new KontextStore();
    store.setStorageAdapter(customAdapter);

    store.addAction({
      id: 'custom-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      projectId: 'test',
      agentId: 'agent-1',
      correlationId: 'corr-1',
      type: 'test',
      description: 'Custom adapter test',
      metadata: {},
    });

    await store.flush();

    // Verify it was persisted in the backing store
    expect(Object.keys(backingStore).length).toBeGreaterThan(0);

    const store2 = new KontextStore();
    store2.setStorageAdapter(customAdapter);
    await store2.restore();

    expect(store2.getActions()).toHaveLength(1);
    expect(store2.getActions()[0]!.id).toBe('custom-1');
  });
});
