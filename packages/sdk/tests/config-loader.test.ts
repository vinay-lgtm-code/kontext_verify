import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfigFile } from '../src/config-loader.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('loadConfigFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kontext-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load a valid kontext.config.json', () => {
    const config = {
      projectId: 'test-project',
      agentId: 'test-agent',
      environment: 'production',
      tokens: ['USDC', 'USDT'],
      chains: ['base', 'ethereum'],
      wallets: ['0x1234'],
      rpcEndpoints: { base: 'https://mainnet.base.org' },
      mode: 'post-send',
    };
    fs.writeFileSync(
      path.join(tmpDir, 'kontext.config.json'),
      JSON.stringify(config),
    );

    const result = loadConfigFile(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe('test-project');
    expect(result!.agentId).toBe('test-agent');
    expect(result!.tokens).toEqual(['USDC', 'USDT']);
    expect(result!.wallets).toEqual(['0x1234']);
    expect(result!.mode).toBe('post-send');
  });

  it('should return null when no config file exists', () => {
    const result = loadConfigFile(tmpDir);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'kontext.config.json'),
      'not json',
    );
    const result = loadConfigFile(tmpDir);
    expect(result).toBeNull();
  });

  it('should return null when projectId is missing', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'kontext.config.json'),
      JSON.stringify({ environment: 'production' }),
    );
    const result = loadConfigFile(tmpDir);
    expect(result).toBeNull();
  });

  it('should find config in parent directory', () => {
    const subDir = path.join(tmpDir, 'a', 'b', 'c');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'kontext.config.json'),
      JSON.stringify({ projectId: 'parent-project' }),
    );

    const result = loadConfigFile(subDir);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe('parent-project');
  });

  it('should load corridors config', () => {
    const config = {
      projectId: 'test',
      corridors: { from: 'US', to: 'IR' },
    };
    fs.writeFileSync(
      path.join(tmpDir, 'kontext.config.json'),
      JSON.stringify(config),
    );

    const result = loadConfigFile(tmpDir);
    expect(result!.corridors).toEqual({ from: 'US', to: 'IR' });
  });
});
