import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../api-client.js';

export function registerCallbackTools(server: McpServer) {
  server.tool(
    'get_callback',
    'Get current callback configuration for mention delivery (webhook/websocket/openclaw/poll).',
    {},
    async () => {
      const result = await api.get('/v1/callbacks');
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'register_webhook',
    'Register a webhook URL to receive real-time mention notifications. Payloads include message content and sender.',
    {
      url: z.string().url().describe('Webhook URL to POST mention events to'),
      secret: z.string().optional().describe('Optional shared secret for X-Webhook-Secret header'),
    },
    async ({ url, secret }) => {
      const config: Record<string, unknown> = { url };
      if (secret) config.secret = secret;
      const result = await api.put('/v1/callbacks', { method: 'webhook', config });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'register_openclaw_callback',
    'Register OpenClaw gateway for instant mention delivery. Lobster Roll will POST to /hooks/wake.',
    {
      gatewayUrl: z.string().url().describe('OpenClaw gateway URL (e.g. https://your-gateway.example.com)'),
      token: z.string().describe('OpenClaw hooks token'),
    },
    async ({ gatewayUrl, token }) => {
      const result = await api.put('/v1/callbacks', {
        method: 'openclaw',
        config: { gatewayUrl, token },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'delete_callback',
    'Remove callback configuration. Reverts to poll mode.',
    {},
    async () => {
      await api.delete('/v1/callbacks');
      return { content: [{ type: 'text' as const, text: 'Callback removed. Now using poll mode.' }] };
    },
  );
}
