import { eq, and, desc, lt, ilike, isNull, inArray, sql, count } from 'drizzle-orm';
import { messages, mentionEvents, accounts, agentCallbacks, channels } from '@lobster-roll/db';
import { AppError, ErrorCodes, parseMentions, MENTION_TIMEOUT_MS } from '@lobster-roll/shared';
import type { CreateMessageInput, ListMessagesInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { ConnectionManager } from './connection-manager.js';

export class MessageService {
  private mentionDeliveryQueue: Queue;
  private mentionTimeoutQueue: Queue;

  constructor(
    private db: Database,
    redis: Redis,
    private timeoutMs = MENTION_TIMEOUT_MS,
    private connectionManager?: ConnectionManager,
  ) {
    this.mentionDeliveryQueue = new Queue('mention-delivery', { connection: redis });
    this.mentionTimeoutQueue = new Queue('mention-timeout', { connection: redis });
  }

  async send(input: CreateMessageInput, senderId: string) {
    // 1. Parse @mentions from content → resolve display names to UUIDs
    const parsed = parseMentions(input.content);
    const mentionTargetIds: string[] = [];

    // Look up channel's workspace for scoping mention resolution
    const [channel] = await this.db
      .select({ workspaceId: channels.workspaceId })
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .limit(1);

    for (const mention of parsed) {
      const [account] = await this.db
        .select()
        .from(accounts)
        .where(
          and(
            ilike(accounts.displayName, mention.displayName),
            channel ? eq(accounts.workspaceId, channel.workspaceId) : undefined,
          ),
        )
        .limit(1);

      if (account) {
        mentionTargetIds.push(account.id);
      }
    }

    // 2. Insert message
    const [message] = await this.db
      .insert(messages)
      .values({
        channelId: input.channelId,
        senderId,
        content: input.content,
        mentions: mentionTargetIds,
        payload: input.payload,
        threadId: input.threadId,
        attachments: input.attachments,
        replyTo: input.replyTo,
      })
      .returning();

    // 3. For each mentioned account: create mention_event + enqueue delivery
    // Skip self-mentions — agents should not receive mention events for their own messages.
    const events = [];
    for (const targetId of mentionTargetIds) {
      if (targetId === senderId) continue;
      const [event] = await this.db
        .insert(mentionEvents)
        .values({
          messageId: message.id,
          targetId,
          status: 'delivered',
          deliveredAt: new Date(),
        })
        .returning();

      events.push(event);

      // Lookup callback config
      const [callback] = await this.db
        .select()
        .from(agentCallbacks)
        .where(eq(agentCallbacks.accountId, targetId))
        .limit(1);

      // Enqueue delivery job
      await this.mentionDeliveryQueue.add('deliver', {
        mentionEventId: event.id,
        messageId: message.id,
        targetId,
        callbackMethod: callback?.method ?? 'poll',
        callbackConfig: callback?.config ?? {},
      });

      // Schedule timeout check
      await this.mentionTimeoutQueue.add(
        'timeout-check',
        { mentionEventId: event.id, targetId },
        { delay: this.timeoutMs },
      );
    }

    // 4. Broadcast message.new to all connected clients in the workspace
    // Broadcast to everyone — frontend filters by channelId client-side.
    // This ensures users see new messages without needing explicit channel subscriptions.
    if (this.connectionManager) {
      this.connectionManager.broadcast('message.new', message);
    }

    return { message, mentionEvents: events };
  }

  async list(input: ListMessagesInput) {
    // When fetching thread messages, filter by threadId.
    // Otherwise, exclude thread replies (threadId IS NULL = top-level channel messages only).
    if (input.threadId) {
      let query = this.db
        .select()
        .from(messages)
        .where(
          and(eq(messages.channelId, input.channelId), eq(messages.threadId, input.threadId)),
        )
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);

      return query;
    }

    // Base channel query: top-level messages only (no thread replies)
    let query = this.db
      .select()
      .from(messages)
      .where(and(eq(messages.channelId, input.channelId), isNull(messages.threadId)))
      .orderBy(desc(messages.createdAt))
      .limit(input.limit);

    if (input.before) {
      // Get the timestamp of the 'before' message for cursor pagination
      const [beforeMsg] = await this.db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.id, input.before))
        .limit(1);

      if (beforeMsg) {
        query = this.db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.channelId, input.channelId),
              isNull(messages.threadId),
              lt(messages.createdAt, beforeMsg.createdAt),
            ),
          )
          .orderBy(desc(messages.createdAt))
          .limit(input.limit);
      }
    }

    return query;
  }

  async getPendingMentions(accountId: string) {
    return this.db
      .select()
      .from(mentionEvents)
      .where(and(eq(mentionEvents.targetId, accountId), eq(mentionEvents.status, 'delivered')));
  }

  /**
   * Returns reply counts keyed by parent message ID for all top-level messages in a channel.
   * Only considers messages that have a threadId set (i.e. are replies).
   */
  async getThreadCounts(channelId: string): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        threadId: messages.threadId,
        replyCount: count(messages.id),
      })
      .from(messages)
      .where(and(eq(messages.channelId, channelId), sql`${messages.threadId} IS NOT NULL`))
      .groupBy(messages.threadId);

    const result: Record<string, number> = {};
    for (const row of rows) {
      if (row.threadId) result[row.threadId] = Number(row.replyCount);
    }
    return result;
  }

  async acknowledgeMention(mentionId: string, accountId: string) {
    const [event] = await this.db
      .select()
      .from(mentionEvents)
      .where(eq(mentionEvents.id, mentionId))
      .limit(1);

    if (!event) {
      throw new AppError(ErrorCodes.MENTION_NOT_FOUND, 'Mention event not found', 404);
    }

    if (event.targetId !== accountId) {
      throw new AppError(ErrorCodes.MENTION_NOT_YOURS, 'You cannot acknowledge this mention', 403);
    }

    if (event.status !== 'delivered') {
      throw new AppError(
        ErrorCodes.MENTION_ALREADY_ACKED,
        `Mention already in status: ${event.status}`,
        400,
      );
    }

    const [updated] = await this.db
      .update(mentionEvents)
      .set({ status: 'acknowledged', ackedAt: new Date() })
      .where(eq(mentionEvents.id, mentionId))
      .returning();

    return updated;
  }
}
