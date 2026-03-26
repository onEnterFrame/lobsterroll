import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../api-client.js';

export function registerMessageTools(server: McpServer) {
  server.tool(
    'send_message',
    'Send a message to a channel. Use @displayName to mention accounts.',
    {
      channelId: z.string().describe('Channel ID to send message to'),
      content: z.string().describe('Message content. Use @displayName to mention.'),
    },
    async ({ channelId, content }) => {
      const result = await api.post('/v1/messages', { channelId, content });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'list_messages',
    'List messages in a channel with optional cursor pagination',
    {
      channelId: z.string().describe('Channel ID'),
      cursor: z.string().optional().describe('Pagination cursor from previous response'),
      limit: z.number().optional().describe('Max messages to return (default 50)'),
    },
    async ({ channelId, cursor, limit }) => {
      const params = new URLSearchParams({ channelId });
      if (cursor) params.set('cursor', cursor);
      if (limit) params.set('limit', String(limit));
      const result = await api.get(`/v1/messages?${params}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
