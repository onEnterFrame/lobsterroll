import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../api-client.js';

export function registerMentionTools(server: McpServer) {
  server.tool(
    'get_pending_mentions',
    'Get pending mention events for the current account',
    {},
    async () => {
      const result = await api.get('/v1/mentions/pending');
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'acknowledge_mention',
    'Acknowledge a mention event',
    { mentionId: z.string().describe('Mention event ID to acknowledge') },
    async ({ mentionId }) => {
      const result = await api.post(`/v1/mentions/${mentionId}/ack`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'respond_mention',
    'Mark a mention as responded to (call after sending your reply)',
    { mentionId: z.string().describe('Mention event ID') },
    async ({ mentionId }) => {
      const result = await api.post(`/v1/mentions/${mentionId}/respond`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'fail_mention',
    'Mark a mention as failed',
    {
      mentionId: z.string().describe('Mention event ID'),
      reason: z.string().optional().describe('Optional failure reason'),
    },
    async ({ mentionId, reason }) => {
      const result = await api.post(`/v1/mentions/${mentionId}/fail`, { reason });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
