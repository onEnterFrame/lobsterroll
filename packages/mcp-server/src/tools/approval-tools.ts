import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../api-client.js';

export function registerApprovalTools(server: McpServer) {
  server.tool(
    'list_pending_approvals',
    'List all pending approval requests in the workspace',
    {},
    async () => {
      const result = await api.get('/v1/approvals/pending');
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'decide_approval',
    'Approve or deny a pending approval request',
    {
      approvalId: z.string().describe('Approval ID'),
      decision: z.enum(['approved', 'denied']).describe('Decision'),
    },
    async ({ approvalId, decision }) => {
      const result = await api.post(`/v1/approvals/${approvalId}/decide`, { decision });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
