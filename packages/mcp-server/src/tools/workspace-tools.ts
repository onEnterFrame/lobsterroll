import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../api-client.js';

export function registerWorkspaceTools(server: McpServer) {
  server.tool(
    'create_workspace',
    'Create a new Lobster Roll workspace',
    { name: z.string().describe('Workspace name'), slug: z.string().describe('URL-friendly slug') },
    async ({ name, slug }) => {
      const result = await api.post('/v1/workspaces', { name, slug });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_workspace',
    'Get workspace details by ID',
    { id: z.string().describe('Workspace ID') },
    async ({ id }) => {
      const result = await api.get(`/v1/workspaces/${id}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
