import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryStorage, FileStorage } from '../src/index.js';
import type { StorageAdapter } from '../src/index.js';

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
    const loaded = await storage.load<{ nested: { value: number } }>('key1');
    expect(loaded!.nested.value).toBe(1);
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
    const storage2 = new FileStorage(testDir);
    const result = await storage2.load('persist-test');
    expect(result).toEqual({ persistent: true });
  });

  it('should expose the base directory', () => {
    expect(storage.getBaseDir()).toBe(path.resolve(testDir));
  });
});

// ============================================================================
// Custom StorageAdapter Interface Tests
// ============================================================================

describe('Custom StorageAdapter', () => {
  it('should work with a custom adapter implementation', async () => {
    const backingStore: Record<string, string> = {};

    const customAdapter: StorageAdapter = {
      async save(key: string, data: unknown): Promise<void> {
        backingStore[key] = JSON.stringify(data);
      },
      async load(key: string): Promise<unknown | null> {
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

    await customAdapter.save('test', { hello: 'world' });
    const result = await customAdapter.load('test');
    expect(result).toEqual({ hello: 'world' });

    const keys = await customAdapter.list();
    expect(keys).toHaveLength(1);
  });
});
