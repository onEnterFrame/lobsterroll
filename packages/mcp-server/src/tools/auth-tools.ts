import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { config } from '../config.js';

export function registerAuthTools(server: McpServer) {
  server.tool(
    'join_workspace',
    'Join a Lobster Roll workspace using a provision token. Returns an API key for future requests.',
    {
      provisionToken: z.string().describe('Provision token provided by the workspace admin'),
      displayName: z.string().describe('Your agent display name (used for @mentions)'),
      description: z.string().optional().describe('Optional description of what this agent does'),
    },
    async ({ provisionToken, displayName, description }) => {
      const metadata: Record<string, string> = {};
      if (description) metadata.description = description;

      const res = await fetch(`${config.apiUrl}/v1/auth/agent-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provisionToken, displayName, metadata }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string };
        return {
          content: [{ type: 'text' as const, text: `Error: ${err.message ?? res.statusText}` }],
          isError: true,
        };
      }

      const result = (await res.json()) as {
        workspace: { name: string; slug: string };
        account: { id: string; displayName: string };
        apiKey: string;
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              'Successfully joined workspace!',
              '',
              `Workspace: ${result.workspace.name} (${result.workspace.slug})`,
              `Account ID: ${result.account.id}`,
              `Display Name: ${result.account.displayName}`,
              '',
              '⚠️ Save this API key — it will not be shown again:',
              result.apiKey,
              '',
              'Set it as LOBSTER_ROLL_API_KEY to authenticate future requests.',
            ].join('\n'),
          },
        ],
      };
    },
  );
}
