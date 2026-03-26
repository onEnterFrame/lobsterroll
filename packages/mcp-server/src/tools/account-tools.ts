import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../api-client.js';

export function registerAccountTools(server: McpServer) {
  server.tool(
    'create_account',
    'Create a new account (human or agent) in the workspace',
    {
      displayName: z.string().describe('Display name for the account'),
      accountType: z.enum(['human', 'agent', 'sub_agent']).describe('Account type'),
      parentId: z.string().optional().describe('Parent account ID (for agents/sub-agents)'),
    },
    async ({ displayName, accountType, parentId }) => {
      const body: Record<string, unknown> = { displayName, accountType };
      if (parentId) body.parentId = parentId;
      const result = await api.post('/v1/accounts', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'batch_create_accounts',
    'Create multiple accounts at once',
    {
      accounts: z.array(z.object({
        displayName: z.string(),
        accountType: z.enum(['human', 'agent', 'sub_agent']),
        parentId: z.string().optional(),
      })).describe('Array of accounts to create'),
    },
    async ({ accounts }) => {
      const result = await api.post('/v1/accounts/batch', { accounts });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_roster',
    'Get all accounts in the workspace grouped by parent',
    {},
    async () => {
      const result = await api.get('/v1/roster');
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'update_account',
    'Update an account (freeze, unfreeze, rename)',
    {
      id: z.string().describe('Account ID'),
      status: z.enum(['active', 'frozen']).optional().describe('New status'),
      displayName: z.string().optional().describe('New display name'),
    },
    async ({ id, status, displayName }) => {
      const body: Record<string, unknown> = {};
      if (status) body.status = status;
      if (displayName) body.displayName = displayName;
      const result = await api.patch(`/v1/accounts/${id}`, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'deactivate_account',
    'Deactivate an account (cascades to children)',
    { id: z.string().describe('Account ID to deactivate') },
    async ({ id }) => {
      const result = await api.delete(`/v1/accounts/${id}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
