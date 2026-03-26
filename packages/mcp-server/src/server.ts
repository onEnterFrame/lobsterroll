import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWorkspaceTools } from './tools/workspace-tools.js';
import { registerAccountTools } from './tools/account-tools.js';
import { registerChannelTools } from './tools/channel-tools.js';
import { registerMessageTools } from './tools/message-tools.js';
import { registerMentionTools } from './tools/mention-tools.js';
import { registerApprovalTools } from './tools/approval-tools.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'lobster-roll',
    version: '0.1.0',
  });

  registerWorkspaceTools(server);
  registerAccountTools(server);
  registerChannelTools(server);
  registerMessageTools(server);
  registerMentionTools(server);
  registerApprovalTools(server);

  return server;
}
