/**
 * channel.test.ts — vitest unit tests for Lobster Roll channel plugin config helpers.
 *
 * Tests cover:
 *  1. resolveAccount throws when apiKey is missing (legacy shape)
 *  2. resolveAccount throws when workspaceId is missing
 *  3. resolveAccount throws when myAccountId is missing (legacy shape)
 *  4. resolveAccount returns correct shape when all fields are present (legacy)
 *  5. inspectAccount returns configured=true when required fields present
 *  6. inspectAccount returns configured=false when config section is missing
 *  7. inspectAccount returns configured=false when apiKey is absent
 *
 * Multi-agent tests:
 *  8.  resolveAgents returns single entry from flat config (backwards compat)
 *  9.  resolveAgents returns all entries from agents array config
 *  10. resolveAccount by accountId from multi-agent config
 *  11. listAccountIds returns all IDs from multi-agent config
 *  12. listAccountIds returns single ID from flat config
 */

import { describe, it, expect } from 'vitest';
import { resolveAccount, resolveAgents, inspectAccount } from './channel.js';
import type { OpenClawConfig } from 'openclaw/plugin-sdk/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Legacy flat-shape config */
function makeCfg(overrides?: Record<string, unknown>): OpenClawConfig {
  return {
    channels: {
      lobsterroll: {
        apiKey: 'lr_test_key',
        workspaceId: 'ws-uuid',
        myAccountId: 'acct-uuid',
        defaultChannelId: 'chan-uuid',
        apiBase: 'https://lobsterroll-api.onrender.com',
        ...overrides,
      },
    },
  } as unknown as OpenClawConfig;
}

/** Multi-agent config */
function makeMultiAgentCfg(): OpenClawConfig {
  return {
    channels: {
      lobsterroll: {
        apiBase: 'https://lobsterroll-api.onrender.com',
        workspaceId: 'ws-uuid',
        agents: [
          {
            name: 'hawkeye',
            accountId: 'acct-hawkeye',
            apiKey: 'lr_hawkeye_key',
            sessionKey: 'agent:main:main',
            defaultChannelId: 'chan-hawkeye',
          },
          {
            name: 'marketing',
            accountId: 'acct-marketing',
            apiKey: 'lr_marketing_key',
            sessionKey: 'session:marketing',
            defaultChannelId: 'chan-marketing',
          },
        ],
      },
    },
  } as unknown as OpenClawConfig;
}

function emptyCfg(): OpenClawConfig {
  return {} as unknown as OpenClawConfig;
}

// ---------------------------------------------------------------------------
// resolveAccount tests (legacy flat shape)
// ---------------------------------------------------------------------------

describe('resolveAccount (legacy flat shape)', () => {
  it('throws when apiKey is missing', () => {
    const cfg = makeCfg({ apiKey: undefined });
    expect(() => resolveAccount(cfg)).toThrow(/apiKey is required/);
  });

  it('throws when workspaceId is missing', () => {
    const cfg = makeCfg({ workspaceId: undefined });
    expect(() => resolveAccount(cfg)).toThrow(/workspaceId is required/);
  });

  it('throws when myAccountId is missing', () => {
    const cfg = makeCfg({ myAccountId: undefined });
    expect(() => resolveAccount(cfg)).toThrow(/myAccountId is required/);
  });

  it('returns a correct ResolvedAccount when all required fields are present', () => {
    const cfg = makeCfg();
    const account = resolveAccount(cfg, 'acct-uuid');
    expect(account.apiKey).toBe('lr_test_key');
    expect(account.workspaceId).toBe('ws-uuid');
    expect(account.myAccountId).toBe('acct-uuid');
    expect(account.defaultChannelId).toBe('chan-uuid');
    expect(account.accountId).toBe('acct-uuid');
    expect(account.apiBase).toBe('https://lobsterroll-api.onrender.com');
    expect(Array.isArray(account.allowFrom)).toBe(true);
  });

  it('defaults apiBase when not provided', () => {
    const cfg = makeCfg({ apiBase: undefined });
    const account = resolveAccount(cfg);
    expect(account.apiBase).toBe('https://lobsterroll-api.onrender.com');
  });
});

// ---------------------------------------------------------------------------
// inspectAccount tests
// ---------------------------------------------------------------------------

describe('inspectAccount', () => {
  it('returns configured=true when all required fields are present', () => {
    const cfg = makeCfg();
    const result = inspectAccount(cfg);
    expect(result.configured).toBe(true);
    expect(result.enabled).toBe(true);
    expect(result.tokenStatus).toBe('available');
  });

  it('returns configured=false when config section is missing entirely', () => {
    const cfg = emptyCfg();
    const result = inspectAccount(cfg);
    expect(result.configured).toBe(false);
    expect(result.enabled).toBe(false);
    expect(result.tokenStatus).toBe('missing');
  });

  it('returns configured=false when apiKey is absent', () => {
    const cfg = makeCfg({ apiKey: undefined });
    const result = inspectAccount(cfg);
    expect(result.configured).toBe(false);
    expect(result.tokenStatus).toBe('missing');
  });

  it('returns configured=false when workspaceId is absent', () => {
    const cfg = makeCfg({ workspaceId: undefined });
    const result = inspectAccount(cfg);
    expect(result.configured).toBe(false);
  });

  it('returns configured=true for multi-agent config', () => {
    const cfg = makeMultiAgentCfg();
    const result = inspectAccount(cfg);
    expect(result.configured).toBe(true);
    expect(result.enabled).toBe(true);
    expect(result.tokenStatus).toBe('available');
  });
});

// ---------------------------------------------------------------------------
// resolveAgents tests (multi-agent)
// ---------------------------------------------------------------------------

describe('resolveAgents', () => {
  it('returns single entry from flat config (backwards compat)', () => {
    const cfg = makeCfg();
    const agents = resolveAgents(cfg);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('default');
    expect(agents[0].accountId).toBe('acct-uuid');
    expect(agents[0].apiKey).toBe('lr_test_key');
    expect(agents[0].sessionKey).toBeUndefined();
    expect(agents[0].defaultChannelId).toBe('chan-uuid');
  });

  it('returns empty array when config section is missing', () => {
    const agents = resolveAgents(emptyCfg());
    expect(agents).toHaveLength(0);
  });

  it('returns all entries from agents array config', () => {
    const cfg = makeMultiAgentCfg();
    const agents = resolveAgents(cfg);
    expect(agents).toHaveLength(2);
    expect(agents[0].name).toBe('hawkeye');
    expect(agents[0].accountId).toBe('acct-hawkeye');
    expect(agents[0].apiKey).toBe('lr_hawkeye_key');
    expect(agents[0].sessionKey).toBe('agent:main:main');
    expect(agents[1].name).toBe('marketing');
    expect(agents[1].accountId).toBe('acct-marketing');
    expect(agents[1].sessionKey).toBe('session:marketing');
  });
});

// ---------------------------------------------------------------------------
// resolveAccount tests (multi-agent)
// ---------------------------------------------------------------------------

describe('resolveAccount (multi-agent shape)', () => {
  it('resolves hawkeye agent by accountId', () => {
    const cfg = makeMultiAgentCfg();
    const account = resolveAccount(cfg, 'acct-hawkeye');
    expect(account.accountId).toBe('acct-hawkeye');
    expect(account.apiKey).toBe('lr_hawkeye_key');
    expect(account.myAccountId).toBe('acct-hawkeye');
    expect(account.defaultChannelId).toBe('chan-hawkeye');
    expect(account.sessionKey).toBe('agent:main:main');
    expect(account.workspaceId).toBe('ws-uuid');
  });

  it('resolves marketing agent by accountId', () => {
    const cfg = makeMultiAgentCfg();
    const account = resolveAccount(cfg, 'acct-marketing');
    expect(account.accountId).toBe('acct-marketing');
    expect(account.apiKey).toBe('lr_marketing_key');
    expect(account.sessionKey).toBe('session:marketing');
    expect(account.defaultChannelId).toBe('chan-marketing');
  });

  it('falls back to first agent when accountId not found', () => {
    const cfg = makeMultiAgentCfg();
    const account = resolveAccount(cfg, 'nonexistent-id');
    expect(account.accountId).toBe('acct-hawkeye');
  });
});

// ---------------------------------------------------------------------------
// listAccountIds tests (via resolveAgents)
// ---------------------------------------------------------------------------

describe('listAccountIds (via resolveAgents)', () => {
  it('returns all IDs from multi-agent config', () => {
    const cfg = makeMultiAgentCfg();
    const ids = resolveAgents(cfg).map(a => a.accountId);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('acct-hawkeye');
    expect(ids).toContain('acct-marketing');
  });

  it('returns single ID from flat config', () => {
    const cfg = makeCfg();
    const ids = resolveAgents(cfg).map(a => a.accountId);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe('acct-uuid');
  });

  it('returns empty array when not configured', () => {
    const ids = resolveAgents(emptyCfg()).map(a => a.accountId);
    expect(ids).toHaveLength(0);
  });
});
