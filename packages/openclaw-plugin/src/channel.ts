/**
 * Lobster Roll channel plugin — core ChannelPlugin implementation.
 *
 * Architecture:
 *  - gateway.startAccount  : opens a persistent WS to /ws/events, handles
 *                            message.new / mention.received events, dispatches
 *                            mentions through the standard inbound pipeline.
 *  - gateway.stopAccount   : aborts the WS connection via AbortController.
 *  - outbound.sendText     : POSTs to /v1/messages and returns the message id.
 *  - On startup            : polls /v1/mentions/pending to replay any missed
 *                            mentions (catches messages sent while offline).
 *
 * Multi-agent support:
 *  - The `agents` array in config allows multiple LR accounts per OpenClaw
 *    instance, each with their own WS connection and optional session routing.
 *  - Backwards compatible with the legacy flat apiKey/myAccountId shape.
 */
import {
  createChatChannelPlugin,
  createChannelPluginBase,
  type OpenClawConfig,
  type ChannelPlugin,
} from 'openclaw/plugin-sdk/core';
import { postMessage, getPendingMentions, ackMention, getMessage } from './client.js';
import { startWsMonitor } from './ws-monitor.js';

// ---------------------------------------------------------------------------
// Config / account types
// ---------------------------------------------------------------------------

export interface LRAgentEntry {
  name: string;
  accountId: string;
  apiKey: string;
  sessionKey?: string;
  defaultChannelId?: string;
}

export interface LRConfig {
  apiBase?: string;
  workspaceId: string;
  // New multi-agent shape
  agents?: LRAgentEntry[];
  // Legacy single-agent shape (backwards compat)
  apiKey?: string;
  myAccountId?: string;
  defaultChannelId?: string;
  allowFrom?: string[];
  dmPolicy?: string;
}

export interface ResolvedAccount {
  accountId: string;
  apiKey: string;
  apiBase: string;
  workspaceId: string;
  myAccountId: string;
  defaultChannelId: string;
  sessionKey?: string;
  allowFrom: string[];
  dmPolicy: string | undefined;
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getSection(cfg: OpenClawConfig): LRConfig | undefined {
  return (cfg.channels as Record<string, unknown> | undefined)?.[
    'lobsterroll'
  ] as LRConfig | undefined;
}

/**
 * Normalise both config shapes into LRAgentEntry[].
 * Falls back to the legacy flat apiKey/myAccountId shape when agents is absent.
 */
export function resolveAgents(cfg: OpenClawConfig): LRAgentEntry[] {
  const s = getSection(cfg);
  if (!s) return [];
  if (s.agents?.length) return s.agents;
  // Legacy flat shape
  if (s.apiKey && s.myAccountId) {
    return [{
      name: 'default',
      accountId: s.myAccountId,
      apiKey: s.apiKey,
      sessionKey: undefined,
      defaultChannelId: s.defaultChannelId,
    }];
  }
  return [];
}

/**
 * Resolve and validate account configuration from openclaw.json.
 * Looks up by accountId when provided; falls back to the first agent entry.
 * Throws a descriptive error when required fields are absent.
 */
export function resolveAccount(cfg: OpenClawConfig, accountId?: string | null): ResolvedAccount {
  const s = getSection(cfg);
  if (!s?.workspaceId) throw new Error('lobsterroll: workspaceId is required in channels.lobsterroll');

  const agents = resolveAgents(cfg);

  // Look up the matching agent entry by accountId
  let entry: LRAgentEntry | undefined;
  if (accountId && accountId !== 'default') {
    entry = agents.find(a => a.accountId === accountId);
  }
  // Fall back to first agent (legacy single-agent or first in array)
  if (!entry) entry = agents[0];

  if (!entry) {
    // No agents configured — check legacy shape for better error messages
    if (!s?.apiKey) throw new Error('lobsterroll: apiKey is required in channels.lobsterroll');
    throw new Error('lobsterroll: myAccountId is required in channels.lobsterroll');
  }

  return {
    accountId: entry.accountId,
    apiKey: entry.apiKey,
    apiBase: s.apiBase ?? 'https://lobsterroll-api.onrender.com',
    workspaceId: s.workspaceId,
    myAccountId: entry.accountId,
    defaultChannelId: entry.defaultChannelId ?? s.defaultChannelId ?? '',
    sessionKey: entry.sessionKey,
    allowFrom: s.allowFrom ?? [],
    dmPolicy: s.dmPolicy,
  };
}

/**
 * Quick health inspection — does not make network requests.
 */
export function inspectAccount(
  cfg: OpenClawConfig,
  _accountId?: string | null,
): { enabled: boolean; configured: boolean; tokenStatus: string } {
  const s = getSection(cfg);
  const agents = s ? resolveAgents(cfg) : [];
  const configured = agents.length > 0 && Boolean(s?.workspaceId);
  return {
    enabled: configured,
    configured,
    tokenStatus: (s?.apiKey || (s?.agents?.length ?? 0) > 0) ? 'available' : 'missing',
  };
}

// ---------------------------------------------------------------------------
// Per-account AbortController map (for stopAccount)
// Also tracks whether startAccount is already running to prevent double-boot
// ---------------------------------------------------------------------------
const abortControllers = new Map<string, AbortController>();
const runningAccounts = new Set<string>();
// Deduplicate dispatches — track recently-dispatched message IDs per account
const recentlyDispatched = new Map<string, Set<string>>();

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const pluginBase = createChannelPluginBase<ResolvedAccount>({
  id: 'lobsterroll',
  capabilities: {
    chatTypes: ['channel', 'group'],
    reply: true,
  },
  config: {
    listAccountIds: (cfg) => resolveAgents(cfg).map(a => a.accountId),
    resolveAccount,
    inspectAccount,
  },
  setup: {
    applyAccountConfig: ({ cfg, input }) => {
      const updated = JSON.parse(JSON.stringify(cfg)) as typeof cfg;
      const channels = (updated.channels as Record<string, unknown>) ?? {};
      channels['lobsterroll'] = {
        ...((channels['lobsterroll'] as Record<string, unknown>) ?? {}),
        ...(input as Record<string, unknown>),
      };
      (updated as Record<string, unknown>)['channels'] = channels;
      return updated;
    },
  },
});

// createChatChannelPlugin requires capabilities to be defined — cast base to satisfy
type PluginBase = Parameters<typeof createChatChannelPlugin<ResolvedAccount>>[0]['base'];

const chatPlugin = createChatChannelPlugin<ResolvedAccount>({
  base: pluginBase as PluginBase,

  security: {
    dm: {
      channelKey: 'lobsterroll',
      resolvePolicy: (account) => account.dmPolicy,
      resolveAllowFrom: (account) => account.allowFrom,
      defaultPolicy: 'allowlist',
    },
  },

  threading: { topLevelReplyToMode: 'reply' },

  outbound: {
    base: {
      deliveryMode: 'direct' as const,
    },
    attachedResults: {
      channel: 'lobsterroll',
      sendText: async (params) => {
        const account = resolveAccount(params.cfg, params.accountId);
        const channelId = (params.to ?? account.defaultChannelId) || '';
        const result = await postMessage(
          account.apiBase,
          account.apiKey,
          account.workspaceId,
          channelId,
          params.text,
        );
        return { messageId: result.message.id };
      },
    },
  },
});

export const lobsterrollPlugin: ChannelPlugin<ResolvedAccount> = {
  ...(chatPlugin as unknown as ChannelPlugin<ResolvedAccount>),

  gateway: {
    /**
     * Start the persistent WS connection for this account.
     * Also drains /v1/mentions/pending on startup to catch missed mentions.
     *
     * In multi-agent mode, this is called once per agent entry in cfg.agents.
     * Each agent gets its own WS connection, AbortController, and dedup set.
     */
    startAccount: async (ctx: any) => {
      const { cfg, log, channelRuntime } = ctx;

      // Resolve the account for this specific agent (by accountId from ctx)
      const account: ResolvedAccount = ctx.account ?? resolveAccount(cfg, ctx.accountId);
      const accountKey = account.accountId;

      // Look up the agent entry to get sessionKey
      const agents = resolveAgents(cfg);
      const agentEntry = agents.find(a => a.accountId === account.accountId) ?? agents[0];

      // Guard against double-start (OpenClaw may call this on every restart)
      if (runningAccounts.has(accountKey)) {
        log?.warn('lobsterroll: startAccount called while already running — aborting previous instance');
        abortControllers.get(accountKey)?.abort();
        runningAccounts.delete(accountKey);
      }
      runningAccounts.add(accountKey);
      recentlyDispatched.set(accountKey, new Set());

      // Provide an AbortController so stopAccount can cancel us
      const ac = new AbortController();
      abortControllers.set(accountKey, ac);

      // Merge any externally supplied abortSignal
      const externalSignal: AbortSignal | undefined = ctx.abortSignal;
      if (externalSignal) {
        externalSignal.addEventListener('abort', () => ac.abort(), { once: true });
      }

      log?.info(`lobsterroll: gateway startAccount — booting accountId=${accountKey} agent=${agentEntry?.name ?? 'default'}`);

      /**
       * Dispatch an inbound mention through the OpenClaw reply pipeline.
       * Routes to agentEntry.sessionKey if set, otherwise uses per-channel session scoping.
       */
      async function dispatchMention(opts: {
        channelId: string;
        senderId: string;
        senderName: string;
        content: string;
        messageId: string;
        parentMessageId?: string | null;
      }) {
        if (!channelRuntime?.reply?.dispatchReplyWithBufferedBlockDispatcher) {
          log?.warn('lobsterroll: channelRuntime.reply not available — cannot dispatch');
          return;
        }

        const { channelId, senderId, senderName, content, messageId, parentMessageId } = opts;

        // Deduplicate — message.new and mention.received can both fire for the same message
        const dispatched = recentlyDispatched.get(accountKey);
        if (dispatched && messageId && dispatched.has(messageId)) {
          log?.info(`lobsterroll: skipping duplicate dispatch for messageId=${messageId}`);
          return;
        }
        if (dispatched && messageId) {
          dispatched.add(messageId);
          // Prune after 30s to avoid memory leak
          setTimeout(() => dispatched.delete(messageId), 30_000);
        }

        log?.info(`lobsterroll: dispatchMention content=${JSON.stringify(content)} channelId=${channelId}`);

        // Signal typing while the agent generates its reply
        sendTypingStart?.(channelId);

        // conversationId convention:
        //   top-level: channelId
        //   thread reply: parentMessageId (with parentConversationId = channelId)
        const conversationId = parentMessageId ?? channelId;

        // SessionKey routing:
        //   - If agent entry has a sessionKey (e.g. "session:marketing"), route to that session
        //   - Otherwise scope to the LR channel/conversation (default behaviour)
        const sessionKey = agentEntry?.sessionKey ?? `lobsterroll:${conversationId}`;

        await channelRuntime.reply.dispatchReplyWithBufferedBlockDispatcher({
          ctx: {
            // MsgContext routing — Surface/Provider tell dispatch which channel to reply on
            Surface: 'lobsterroll',
            Provider: 'lobsterroll',
            // Message content
            Body: content,
            BodyForAgent: content,
            BodyForCommands: content,
            RawBody: content,
            CommandBody: content,
            // Sender / conversation routing
            From: senderId,
            To: account.myAccountId,
            // WasMentioned enables group-channel replies
            WasMentioned: true,
            CommandAuthorized: true,
            ChatType: 'group',
            // Session routing: use agent's configured sessionKey or fall back to channel scope
            SessionKey: sessionKey,
            // Extra context passed through for our deliver callback
            channel: 'lobsterroll',
            accountId: account.accountId,
            conversationId,
            ...(parentMessageId ? { parentConversationId: channelId } : {}),
            senderId,
            senderName,
            isGroup: true,
            Timestamp: Date.now(),
            messageId,
          },
          cfg,
          dispatcherOptions: {
            deliver: async (reply: any) => {
              const text: string =
                typeof reply === 'string'
                  ? reply
                  : (reply?.text ?? reply?.body ?? String(reply ?? ''));
              sendTypingStop?.(channelId);
              if (text && text !== 'HEARTBEAT_OK') {
                await postMessage(
                  account.apiBase,
                  account.apiKey,
                  account.workspaceId,
                  channelId,
                  text,
                  { threadId: parentMessageId ?? undefined },
                );
                log?.info(`lobsterroll: reply sent to channel ${channelId}`);
              }
            },
          },
        });
      }

      // ------------------------------------------------------------------
      // Step 1 — replay missed mentions from /v1/mentions/pending
      // ------------------------------------------------------------------
      try {
        const pending = await getPendingMentions(account.apiBase, account.apiKey, account.workspaceId);
        log?.info(`lobsterroll: ${pending.length} pending mention(s) to replay`);
        for (const m of pending) {
          if (ac.signal.aborted) break;
          const mentionId = m.id ?? m.mentionEventId ?? '';

          // Pending mention rows only have messageId — fetch the full message for content + channelId
          const msg = await getMessage(account.apiBase, account.apiKey, account.workspaceId, m.messageId)
            .catch(() => null);

          if (!msg) {
            log?.warn(`lobsterroll: could not fetch message ${m.messageId} for pending mention — skipping`);
            await ackMention(account.apiBase, account.apiKey, account.workspaceId, mentionId);
            continue;
          }

          await dispatchMention({
            channelId: msg.channelId,
            senderId: msg.senderId,
            senderName: m.senderDisplayName ?? 'unknown',
            content: msg.content,
            messageId: mentionId,
          }).catch((e: unknown) =>
            log?.error(`lobsterroll: pending mention dispatch error — ${(e as Error)?.message}`),
          );
          await ackMention(account.apiBase, account.apiKey, account.workspaceId, mentionId);
        }
      } catch (err: unknown) {
        log?.warn(`lobsterroll: could not fetch pending mentions — ${(err as Error)?.message}`);
      }

      // ------------------------------------------------------------------
      // Step 2 — open the live WS event stream
      // ------------------------------------------------------------------
      // Cleanup running flag when we exit (abort or error)
      ac.signal.addEventListener('abort', () => {
        runningAccounts.delete(accountKey);
        recentlyDispatched.delete(accountKey);
      }, { once: true });

      // Typing helpers — populated once WS opens
      let sendTypingStart: ((channelId: string) => void) | undefined;
      let sendTypingStop: ((channelId: string) => void) | undefined;

      await startWsMonitor({
        apiBase: account.apiBase,
        apiKey: account.apiKey,
        abortSignal: ac.signal,
        log,
        onConnected: () => log?.info('lobsterroll: WS connected'),
        onDisconnected: () => log?.info('lobsterroll: WS disconnected'),
        onHandle: (handle) => {
          sendTypingStart = handle.sendTypingStart;
          sendTypingStop = handle.sendTypingStop;
        },
        onEvent: async (event) => {
          // Handle both message.new (with mentions array) and mention.received
          if (event.type === 'message.new') {
            const data = event.data as Record<string, unknown>;
            log?.info(`lobsterroll: message.new id=${data.id} content=${JSON.stringify(data.content)} mentions=${JSON.stringify(data.mentions)}`);
            const mentions = (data.mentions as string[]) ?? [];
            if (!mentions.includes(account.myAccountId)) return;

            const dispatchContent = (data.content as string) ?? '';
            log?.info(`lobsterroll: dispatching mention content=${JSON.stringify(dispatchContent)} channelId=${data.channelId}`);
            await dispatchMention({
              channelId: (data.channelId as string) ?? account.defaultChannelId,
              senderId: (data.senderId as string) ?? '',
              senderName: (data.senderDisplayName as string) ?? 'unknown',
              content: dispatchContent,
              messageId: (data.id as string) ?? '',
              parentMessageId: (data.threadId as string | null) ?? null,
            });
          } else if (event.type === 'mention.received') {
            const data = event.data as Record<string, unknown>;
            await dispatchMention({
              channelId: (data.channelId as string) ?? account.defaultChannelId,
              senderId: (data.targetId as string) ?? '',
              senderName: (data.senderDisplayName as string) ?? 'unknown',
              content: (data.message as string) ?? '',
              messageId: (data.mentionEventId as string) ?? '',
            });
            const mentionId = data.mentionEventId as string;
            if (mentionId) {
              await ackMention(account.apiBase, account.apiKey, account.workspaceId, mentionId);
            }
          }
        },
      });
    },

    /**
     * Stop the WS connection for this account.
     */
    stopAccount: async (ctx: any) => {
      const accountId: string = ctx.account?.accountId ?? ctx.accountId ?? 'default';
      const ac = abortControllers.get(accountId);
      if (ac) {
        ac.abort();
        abortControllers.delete(accountId);
      }
    },
  },
};
