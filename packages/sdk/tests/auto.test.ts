import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { Kontext } from '../src/index.js';

describe('Kontext.auto', () => {
  let kontext: Kontext | undefined;

  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save and clear relevant env vars
    for (const key of ['KONTEXT_API_KEY', 'KONTEXT_PROJECT_ID', 'NODE_ENV']) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(async () => {
    if (kontext) {
      await kontext.destroy();
      kontext = undefined;
    }
    // Restore env vars
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('should default to local mode, development environment, startup plan with no env vars', () => {
    kontext = Kontext.auto();
    expect(kontext.getMode()).toBe('local');
    const config = kontext.getConfig();
    expect(config.environment).toBe('development');
    expect(config.projectId).toBe('kontext-project');
    expect(config.plan).toBe('startup');
  });

  it('should use cloud mode when KONTEXT_API_KEY is set', () => {
    process.env['KONTEXT_API_KEY'] = 'sk_test_123';
    kontext = Kontext.auto();
    expect(kontext.getMode()).toBe('cloud');
  });

  it('should map NODE_ENV=production to production environment', () => {
    process.env['NODE_ENV'] = 'production';
    kontext = Kontext.auto();
    const config = kontext.getConfig();
    expect(config.environment).toBe('production');
  });

  it('should map NODE_ENV=staging to staging environment', () => {
    process.env['NODE_ENV'] = 'staging';
    kontext = Kontext.auto();
    const config = kontext.getConfig();
    expect(config.environment).toBe('staging');
  });

  it('should use KONTEXT_PROJECT_ID when set', () => {
    process.env['KONTEXT_PROJECT_ID'] = 'my-project';
    kontext = Kontext.auto();
    const config = kontext.getConfig();
    expect(config.projectId).toBe('my-project');
  });

  it('should allow overrides to win over env vars', () => {
    process.env['KONTEXT_PROJECT_ID'] = 'env-project';
    process.env['NODE_ENV'] = 'production';
    kontext = Kontext.auto({
      projectId: 'override-project',
      environment: 'staging',
      plan: 'enterprise',
    });
    const config = kontext.getConfig();
    expect(config.projectId).toBe('override-project');
    expect(config.environment).toBe('staging');
    expect(config.plan).toBe('enterprise');
  });

  it('should default plan to startup', () => {
    kontext = Kontext.auto();
    const config = kontext.getConfig();
    expect(config.plan).toBe('startup');
  });
});
