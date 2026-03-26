import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWorkspaceTools } from './tools/workspace-tools.js';
import { registerAccountTools } from './tools/account-tools.js';
import { registerChannelTools } from './tools/channel-tools.js';
import { registerMessageTools } from './tools/message-tools.js';
import { registerMentionTools } from './tools/mention-tools.js';
import { registerApprovalTools } from './tools/approval-tools.js';
import { registerCallbackTools } from './tools/callback-tools.js';
import { registerAuthTools } from './tools/auth-tools.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'lobster-roll',
    version: '0.1.0',
  });

  // Auth (join_workspace) — works without API key
  registerAuthTools(server);

  // Workspace and account management
  registerWorkspaceTools(server);
  registerAccountTools(server);

  // Channels and messaging
  registerChannelTools(server);
  registerMessageTools(server);

  // Mentions and callbacks
  registerMentionTools(server);
  registerCallbackTools(server);

  // Human approval workflow
  registerApprovalTools(server);

  return server;
}
