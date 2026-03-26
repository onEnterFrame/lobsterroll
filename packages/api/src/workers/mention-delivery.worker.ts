import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import type { Database } from '@lobster-roll/db';
import { messages, accounts } from '@lobster-roll/db';
import { WEBHOOK_RETRY_ATTEMPTS, WEBHOOK_BACKOFF_BASE_MS } from '@lobster-roll/shared';

interface DeliveryJobData {
  mentionEventId: string;
  messageId: string;
  targetId: string;
  callbackMethod: 'webhook' | 'websocket' | 'poll' | 'openclaw';
  callbackConfig: Record<string, unknown>;
}

export function createMentionDeliveryWorker(
  redis: Redis,
  db: Database,
  connectionManager?: { send: (accountId: string, event: string, data: unknown) => void },
) {
  const worker = new Worker<DeliveryJobData>(
    'mention-delivery',
    async (job) => {
      const { mentionEventId, messageId, targetId, callbackMethod, callbackConfig } = job.data;

      // Fetch message + sender for enriched payloads (webhook, openclaw, websocket)
      // so agents can act without a second round-trip.
      let messageContent: string | null = null;
      let senderDisplayName: string | null = null;
      let channelId: string | null = null;

      if (callbackMethod !== 'poll') {
        const [msg] = await db
          .select()
          .from(messages)
          .where(eq(messages.id, messageId))
          .limit(1);

        if (msg) {
          messageContent = msg.content;
          channelId = msg.channelId;

          const [sender] = await db
            .select({ displayName: accounts.displayName })
            .from(accounts)
            .where(eq(accounts.id, msg.senderId))
            .limit(1);

          senderDisplayName = sender?.displayName ?? null;
        }
      }

      const enrichedPayload = {
        event: 'mention.received',
        mentionEventId,
        messageId,
        targetId,
        channelId,
        message: messageContent,
        senderDisplayName,
        timestamp: new Date().toISOString(),
      };

      switch (callbackMethod) {
        case 'webhook': {
          const url = callbackConfig.url as string;
          const secret = callbackConfig.secret as string | undefined;
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(callbackConfig.headers as Record<string, string> | undefined),
          };

          if (secret) {
            headers['X-Webhook-Secret'] = secret;
          }

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(enrichedPayload),
          });

          if (!response.ok) {
            throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
          }
          break;
        }

        case 'openclaw': {
          // OpenClaw gateway integration.
          // Config: { gatewayUrl: "https://...", token: "..." }
          // Posts to /hooks/wake which triggers an immediate agent heartbeat.
          const gatewayUrl = callbackConfig.gatewayUrl as string;
          const token = callbackConfig.token as string;

          if (!gatewayUrl || !token) {
            throw new Error('openclaw callback requires gatewayUrl and token in config');
          }

          const hooksUrl = `${gatewayUrl.replace(/\/$/, '')}/hooks/wake`;

          const response = await fetch(hooksUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: `Lobster Roll mention from @${senderDisplayName ?? 'unknown'}: ${messageContent ?? '(no content)'}`,
              mode: 'now',
              // Pass structured data so the agent can retrieve full context
              metadata: enrichedPayload,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `OpenClaw delivery failed: ${response.status} ${response.statusText}`,
            );
          }
          break;
        }

        case 'websocket': {
          // Push via WebSocket connection manager
          connectionManager?.send(targetId, 'mention.received', enrichedPayload);
          break;
        }

        case 'poll':
          // No-op — agent polls /v1/mentions/pending
          break;
      }
    },
    {
      connection: redis,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 1000,
      },
    },
  );

  worker.on('failed', (job, err) => {
    if (job) {
      console.error(`Mention delivery failed for ${job.id}:`, err.message);
    }
  });

  return worker;
}

export const MENTION_DELIVERY_JOB_OPTIONS = {
  attempts: WEBHOOK_RETRY_ATTEMPTS,
  backoff: {
    type: 'exponential' as const,
    delay: WEBHOOK_BACKOFF_BASE_MS,
  },
};
