import { api } from '@/api/client';

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  handler: (args: string, context: SlashContext) => Promise<SlashResult>;
}

export interface SlashContext {
  channelId: string;
  currentAccountId: string;
  accounts: Map<string, { id: string; displayName: string }>;
}

export interface SlashResult {
  handled: boolean;
  message?: string;
}

function findAccountByName(name: string, accounts: Map<string, { id: string; displayName: string }>): string | null {
  const cleaned = name.replace(/^@/, '').toLowerCase();
  for (const [id, acc] of accounts) {
    if (acc.displayName.toLowerCase() === cleaned) return id;
  }
  return null;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: '/assign',
    description: 'Assign a task to someone',
    usage: '/assign @name Task description',
    handler: async (args, ctx) => {
      const match = args.match(/^@?(\S+)\s+(.+)/);
      if (!match) return { handled: false, message: 'Usage: /assign @name Task description' };
      const assigneeId = findAccountByName(match[1], ctx.accounts);
      if (!assigneeId) return { handled: false, message: `User "${match[1]}" not found` };
      await api.post('/v1/tasks', {
        channelId: ctx.channelId,
        assigneeId,
        title: match[2],
      });
      return { handled: true };
    },
  },
  {
    name: '/approve',
    description: 'Request approval for an action',
    usage: '/approve action-type Description of what needs approval',
    handler: async (args, ctx) => {
      const match = args.match(/^(\S+)\s+(.+)/);
      if (!match) return { handled: false, message: 'Usage: /approve action-type Description' };
      await api.post('/v1/approval-requests', {
        channelId: ctx.channelId,
        actionType: match[1],
        description: match[2],
      });
      return { handled: true };
    },
  },
  {
    name: '/doc',
    description: 'Create a channel doc',
    usage: '/doc Title of the document',
    handler: async (args, ctx) => {
      const title = args.trim();
      if (!title) return { handled: false, message: 'Usage: /doc Title of the document' };
      await api.post('/v1/docs', {
        channelId: ctx.channelId,
        title,
        content: '',
      });
      return { handled: true };
    },
  },
  {
    name: '/webhook',
    description: 'Create a webhook for this channel',
    usage: '/webhook Webhook Name',
    handler: async (args, ctx) => {
      const name = args.trim();
      if (!name) return { handled: false, message: 'Usage: /webhook Name' };
      const result = await api.post<{ token: string }>('/v1/webhooks', {
        channelId: ctx.channelId,
        name,
      });
      // Send the webhook URL as a message so the user can copy it
      const apiUrl = import.meta.env.VITE_API_URL ?? '';
      await api.post('/v1/messages', {
        channelId: ctx.channelId,
        content: `🔗 Webhook **${name}** created!\n\nIngest URL:\n\`POST ${apiUrl}/v1/webhooks/ingest/${result.token}\`\n\nBody: \`{ "content": "...", "senderName": "..." }\``,
      });
      return { handled: true };
    },
  },
  {
    name: '/status',
    description: 'Set your status message',
    usage: '/status Your status message',
    handler: async (args) => {
      const msg = args.trim();
      await api.put('/v1/presence/status', {
        status: 'online',
        statusMessage: msg || null,
      });
      return { handled: true };
    },
  },
  {
    name: '/dnd',
    description: 'Set Do Not Disturb',
    usage: '/dnd',
    handler: async () => {
      await api.put('/v1/presence/status', { status: 'dnd' });
      return { handled: true };
    },
  },
  {
    name: '/dm',
    description: 'Send a direct message',
    usage: '/dm @name Your message',
    handler: async (args, ctx) => {
      const match = args.match(/^@?(\S+)\s+(.+)/);
      if (!match) return { handled: false, message: 'Usage: /dm @name Your message' };
      const targetId = findAccountByName(match[1], ctx.accounts);
      if (!targetId) return { handled: false, message: `User "${match[1]}" not found` };
      // Create or find DM channel, then send
      const dmChannel = await api.post<{ id: string }>('/v1/channels/dm', {
        targetAccountId: targetId,
      });
      await api.post('/v1/messages', {
        channelId: dmChannel.id,
        content: match[2],
      });
      return { handled: true, message: `DM sent to ${match[1]}` };
    },
  },
];

export function parseSlashCommand(input: string): { command: SlashCommand; args: string } | null {
  if (!input.startsWith('/')) return null;
  const cmd = SLASH_COMMANDS.find((c) => input.startsWith(c.name + ' ') || input === c.name);
  if (!cmd) return null;
  const args = input.slice(cmd.name.length).trim();
  return { command: cmd, args };
}
