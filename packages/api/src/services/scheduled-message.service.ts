import { eq, and, lte, desc } from 'drizzle-orm';
import { scheduledMessages, messages } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateScheduledMessageInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { connectionManager } from './connection-manager.js';

export class ScheduledMessageService {
  constructor(private db: Database) {}

  async create(input: CreateScheduledMessageInput, senderId: string) {
    if (!input.scheduledAt && !input.cronExpr) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Either scheduledAt or cronExpr is required', 400);
    }

    const [scheduled] = await this.db
      .insert(scheduledMessages)
      .values({
        channelId: input.channelId,
        senderId,
        content: input.content,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        cronExpr: input.cronExpr ?? null,
        timezone: input.timezone,
      })
      .returning();

    return scheduled;
  }

  async listForSender(senderId: string) {
    return this.db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.senderId, senderId))
      .orderBy(desc(scheduledMessages.createdAt));
  }

  async delete(id: string, senderId: string) {
    const [existing] = await this.db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Scheduled message not found', 404);
    }
    if (existing.senderId !== senderId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Not your scheduled message', 403);
    }

    await this.db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
  }

  async toggle(id: string, senderId: string, enabled: boolean) {
    const [updated] = await this.db
      .update(scheduledMessages)
      .set({ enabled })
      .where(and(eq(scheduledMessages.id, id), eq(scheduledMessages.senderId, senderId)))
      .returning();

    if (!updated) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Scheduled message not found', 404);
    }

    return updated;
  }

  // Called by a worker/cron to fire due messages
  async fireDueMessages() {
    const now = new Date();
    const due = await this.db
      .select()
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.enabled, true),
          lte(scheduledMessages.scheduledAt, now),
        ),
      );

    const fired: string[] = [];
    for (const scheduled of due) {
      // Create the actual message
      const [message] = await this.db
        .insert(messages)
        .values({
          channelId: scheduled.channelId,
          senderId: scheduled.senderId,
          content: scheduled.content,
          mentions: [],
          payload: { type: 'scheduled', scheduledId: scheduled.id },
        })
        .returning();

      connectionManager.broadcast('message.new', message);

      if (scheduled.cronExpr) {
        // Recurring: update lastSentAt (next fire computed externally)
        await this.db
          .update(scheduledMessages)
          .set({ lastSentAt: now })
          .where(eq(scheduledMessages.id, scheduled.id));
      } else {
        // One-shot: disable after firing
        await this.db
          .update(scheduledMessages)
          .set({ enabled: false, lastSentAt: now })
          .where(eq(scheduledMessages.id, scheduled.id));
      }

      fired.push(scheduled.id);
    }

    return fired;
  }
}
