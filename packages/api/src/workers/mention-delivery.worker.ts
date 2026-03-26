import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Database } from '@lobster-roll/db';
import { WEBHOOK_RETRY_ATTEMPTS, WEBHOOK_BACKOFF_BASE_MS } from '@lobster-roll/shared';

interface DeliveryJobData {
  mentionEventId: string;
  messageId: string;
  targetId: string;
  callbackMethod: 'webhook' | 'websocket' | 'poll';
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
            body: JSON.stringify({
              event: 'mention.received',
              mentionEventId,
              messageId,
              targetId,
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
          }
          break;
        }

        case 'websocket': {
          // Push via WebSocket connection manager
          connectionManager?.send(targetId, 'mention.received', {
            mentionEventId,
            messageId,
            targetId,
          });
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

  // Configure retries at the queue level
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
