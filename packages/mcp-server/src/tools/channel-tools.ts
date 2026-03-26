import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../api-client.js';

export function registerChannelTools(server: McpServer) {
  server.tool(
    'create_channel',
    'Create a new channel in the workspace',
    {
      name: z.string().describe('Channel name'),
      channelType: z.enum(['text', 'file_drop', 'voice', 'broadcast']).optional().describe('Channel type'),
      visibility: z.enum(['public', 'private']).optional().describe('Channel visibility'),
      topic: z.string().optional().describe('Channel topic'),
    },
    async ({ name, channelType, visibility, topic }) => {
      const body: Record<string, unknown> = { name };
      if (channelType) body.channelType = channelType;
      if (visibility) body.visibility = visibility;
      if (topic) body.topic = topic;
      const result = await api.post('/v1/channels', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'list_channels',
    'List all channels in the workspace',
    {},
    async () => {
      const result = await api.get('/v1/channels');
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'subscribe_to_channel',
    'Subscribe one or more accounts to a channel',
    {
      channelId: z.string().describe('Channel ID'),
      accountIds: z.array(z.string()).describe('Account IDs to subscribe'),
    },
    async ({ channelId, accountIds }) => {
      const result = await api.post(`/v1/channels/${channelId}/subscribe`, { accountIds });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
