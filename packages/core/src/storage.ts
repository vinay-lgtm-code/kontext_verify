import * as fs from 'fs';
import * as path from 'path';

export interface StorageAdapter {
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

export class MemoryStorage implements StorageAdapter {
  private data = new Map<string, unknown>();

  async save<T>(key: string, data: T): Promise<void> {
    this.data.set(key, structuredClone(data));
  }

  async load<T>(key: string): Promise<T | null> {
    const value = this.data.get(key);
    if (value === undefined) {
      return null;
    }
    return structuredClone(value) as T;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = [...this.data.keys()];
    if (!prefix) {
      return keys;
    }
    return keys.filter((key) => key.startsWith(prefix));
  }
}

export class FileStorage implements StorageAdapter {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  async save<T>(key: string, data: T): Promise<void> {
    fs.mkdirSync(this.baseDir, { recursive: true });
    const filePath = this.keyToPath(key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load<T>(key: string): Promise<T | null> {
    const filePath = this.keyToPath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.keyToPath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async list(prefix?: string): Promise<string[]> {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }
    return this.listRecursive(this.baseDir, prefix);
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  private keyToPath(key: string): string {
    const safeName = key.replace(/[<>"|?*]/g, '_');
    return path.join(this.baseDir, `${safeName}.json`);
  }

  private pathToKey(filePath: string): string {
    const relative = path.relative(this.baseDir, filePath);
    return relative.replace(/\.json$/, '');
  }

  private listRecursive(dir: string, prefix?: string): string[] {
    const keys: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        keys.push(...this.listRecursive(fullPath, prefix));
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      const key = this.pathToKey(fullPath);
      if (!prefix || key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }
}
