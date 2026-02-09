import { describe, it, expect, vi } from 'vitest';
import { UsdcCompliance, Kontext } from '../src/index.js';
import type { LogTransactionInput } from '../src/index.js';

// ============================================================================
// OFAC Sanctions Address Matching Tests
// ============================================================================

describe('OFAC Sanctions - isSanctioned()', () => {
  it('should detect known Tornado Cash address', () => {
    expect(
      UsdcCompliance.isSanctioned('0x722122dF12D4e14e13Ac3b6895a86e84145b6967'),
    ).toBe(true);
  });

  it('should detect Tornado Cash Router', () => {
    expect(
      UsdcCompliance.isSanctioned('0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2'),
    ).toBe(true);
  });

  it('should detect Lazarus Group address', () => {
    expect(
      UsdcCompliance.isSanctioned('0x098B716B8Aaf21512996dC57EB0615e2383E2f96'),
    ).toBe(true);
  });

  it('should detect Garantex address', () => {
    expect(
      UsdcCompliance.isSanctioned('0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7'),
    ).toBe(true);
  });

  it('should detect Blender.io address', () => {
    expect(
      UsdcCompliance.isSanctioned('0x23773E65ed146A459791799d01336DB287f25334'),
    ).toBe(true);
  });

  it('should be case-insensitive (lowercase input)', () => {
    expect(
      UsdcCompliance.isSanctioned('0x722122df12d4e14e13ac3b6895a86e84145b6967'),
    ).toBe(true);
  });

  it('should be case-insensitive (uppercase input)', () => {
    expect(
      UsdcCompliance.isSanctioned('0x722122DF12D4E14E13AC3B6895A86E84145B6967'),
    ).toBe(true);
  });

  it('should return false for non-sanctioned address', () => {
    expect(
      UsdcCompliance.isSanctioned('0x0000000000000000000000000000000000000001'),
    ).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(UsdcCompliance.isSanctioned('')).toBe(false);
  });

  it('should return false for random valid address', () => {
    expect(
      UsdcCompliance.isSanctioned('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
    ).toBe(false);
  });
});

// ============================================================================
// Detailed Sanctions Check
// ============================================================================

describe('OFAC Sanctions - checkSanctionsDetailed()', () => {
  it('should return match details for sanctioned address', () => {
    const result = UsdcCompliance.checkSanctionsDetailed(
      '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    );
    expect(result.sanctioned).toBe(true);
    expect(result.listMatch).toBe('OFAC_SDN');
    expect(result.matchedAddress).toBe('0x722122dF12D4e14e13Ac3b6895a86e84145b6967');
  });

  it('should return match details with case-insensitive lookup', () => {
    const result = UsdcCompliance.checkSanctionsDetailed(
      '0x722122df12d4e14e13ac3b6895a86e84145b6967',
    );
    expect(result.sanctioned).toBe(true);
    expect(result.listMatch).toBe('OFAC_SDN');
    // matchedAddress should be the original-case version from the list
    expect(result.matchedAddress).toBe('0x722122dF12D4e14e13Ac3b6895a86e84145b6967');
  });

  it('should return no match for clean address', () => {
    const result = UsdcCompliance.checkSanctionsDetailed(
      '0x0000000000000000000000000000000000000001',
    );
    expect(result.sanctioned).toBe(false);
    expect(result.listMatch).toBeNull();
    expect(result.matchedAddress).toBeNull();
  });
});

// ============================================================================
// getSanctionedAddresses()
// ============================================================================

describe('OFAC Sanctions - getSanctionedAddresses()', () => {
  it('should return a non-empty list of sanctioned addresses', () => {
    const addresses = UsdcCompliance.getSanctionedAddresses();
    // Expanded from 22 to 33+ addresses (added new SDN entries + delisted retained)
    expect(addresses.length).toBeGreaterThan(30);
  });

  it('should contain known Tornado Cash address', () => {
    const addresses = UsdcCompliance.getSanctionedAddresses();
    const lower = addresses.map((a) => a.toLowerCase());
    expect(lower).toContain('0x722122df12d4e14e13ac3b6895a86e84145b6967');
  });

  it('should return a copy (not a reference)', () => {
    const a1 = UsdcCompliance.getSanctionedAddresses();
    const a2 = UsdcCompliance.getSanctionedAddresses();
    expect(a1).not.toBe(a2);
    expect(a1).toEqual(a2);
  });
});

// ============================================================================
// Compliance Check Integration with Sanctions
// ============================================================================

describe('Compliance check - sanctions integration', () => {
  const baseTx: LogTransactionInput = {
    txHash: '0x' + 'a'.repeat(64),
    chain: 'base',
    amount: '100',
    token: 'USDC',
    from: '0x' + '1'.repeat(40),
    to: '0x' + '2'.repeat(40),
    agentId: 'agent-1',
  };

  it('should fail compliance for sanctioned sender', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const check = UsdcCompliance.checkTransaction({
      ...baseTx,
      from: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    });

    expect(check.compliant).toBe(false);
    expect(check.riskLevel).toBe('critical');

    const sanctionsCheck = check.checks.find((c) => c.name === 'sanctions_sender');
    expect(sanctionsCheck).toBeDefined();
    expect(sanctionsCheck!.passed).toBe(false);
    expect(sanctionsCheck!.severity).toBe('critical');
    expect(sanctionsCheck!.description).toContain('OFAC_SDN');

    warnSpy.mockRestore();
  });

  it('should fail compliance for sanctioned recipient', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const check = UsdcCompliance.checkTransaction({
      ...baseTx,
      to: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
    });

    expect(check.compliant).toBe(false);
    expect(check.riskLevel).toBe('critical');

    const sanctionsCheck = check.checks.find((c) => c.name === 'sanctions_recipient');
    expect(sanctionsCheck).toBeDefined();
    expect(sanctionsCheck!.passed).toBe(false);

    warnSpy.mockRestore();
  });

  it('should pass compliance for clean addresses', () => {
    const check = UsdcCompliance.checkTransaction(baseTx);
    expect(check.compliant).toBe(true);

    const senderCheck = check.checks.find((c) => c.name === 'sanctions_sender');
    const recipientCheck = check.checks.find((c) => c.name === 'sanctions_recipient');
    expect(senderCheck!.passed).toBe(true);
    expect(recipientCheck!.passed).toBe(true);
  });

  it('should recommend blocking sanctioned transactions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const check = UsdcCompliance.checkTransaction({
      ...baseTx,
      to: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    });

    expect(check.recommendations).toContain(
      'BLOCK: Address matches OFAC SDN sanctioned entity. Transaction is prohibited under U.S. law.',
    );

    warnSpy.mockRestore();
  });

  it('should log a warning when sanctioned address is detected', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    UsdcCompliance.checkTransaction({
      ...baseTx,
      from: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    });

    expect(warnSpy).toHaveBeenCalled();
    const warnCall = warnSpy.mock.calls[0]?.[0] as string;
    expect(warnCall).toContain('SANCTIONS WARNING');
    expect(warnCall).toContain('OFAC_SDN');

    warnSpy.mockRestore();
  });

  it('should handle case-insensitive sanctioned address in compliance check', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const check = UsdcCompliance.checkTransaction({
      ...baseTx,
      to: '0x722122DF12D4E14E13AC3B6895A86E84145B6967', // all uppercase
    });

    expect(check.compliant).toBe(false);

    warnSpy.mockRestore();
  });
});

// ============================================================================
// Kontext Client USDC Compliance with Sanctions
// ============================================================================

describe('Kontext.checkUsdcCompliance with sanctions', () => {
  it('should detect sanctioned addresses through the client', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const kontext = Kontext.init({
      projectId: 'test-project',
      environment: 'development',
    });

    const check = kontext.checkUsdcCompliance({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2', // Tornado Cash Router
      agentId: 'agent-1',
    });

    expect(check.compliant).toBe(false);
    expect(check.riskLevel).toBe('critical');

    await kontext.destroy();
    warnSpy.mockRestore();
  });
});
