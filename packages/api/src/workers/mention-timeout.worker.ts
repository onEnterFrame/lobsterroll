import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { mentionEvents, accounts } from '@lobster-roll/db';
import type { Redis } from 'ioredis';
import type { Database } from '@lobster-roll/db';

interface TimeoutJobData {
  mentionEventId: string;
  targetId: string;
}

export function createMentionTimeoutWorker(
  redis: Redis,
  db: Database,
  connectionManager?: { send: (accountId: string, event: string, data: unknown) => void },
) {
  const worker = new Worker<TimeoutJobData>(
    'mention-timeout',
    async (job) => {
      const { mentionEventId, targetId } = job.data;

      // Check if mention has been acknowledged
      const [event] = await db
        .select()
        .from(mentionEvents)
        .where(eq(mentionEvents.id, mentionEventId))
        .limit(1);

      if (!event) return;

      // If already acknowledged or responded, skip
      if (event.status !== 'delivered') return;

      // Mark as timed out
      await db
        .update(mentionEvents)
        .set({ status: 'timed_out', timedOutAt: new Date() })
        .where(eq(mentionEvents.id, mentionEventId));

      // Escalate to parent human
      const [target] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, targetId))
        .limit(1);

      if (target?.parentId) {
        const [parent] = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, target.parentId))
          .limit(1);

        if (parent && parent.accountType === 'human') {
          // Notify parent via WebSocket
          connectionManager?.send(parent.id, 'mention.timeout', {
            mentionEventId,
            targetId,
            targetDisplayName: target.displayName,
          });
        }
      }
    },
    {
      connection: redis,
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    if (job) {
      console.error(`Mention timeout check failed for ${job.id}:`, err.message);
    }
  });

  return worker;
}
