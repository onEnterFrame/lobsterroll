import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { channelWebhooks, messages } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateWebhookInput, WebhookPayloadInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { connectionManager } from './connection-manager.js';

export class WebhookService {
  constructor(private db: Database) {}

  async create(input: CreateWebhookInput, createdBy: string) {
    const token = `lrwh_${randomBytes(24).toString('hex')}`;

    const [webhook] = await this.db
      .insert(channelWebhooks)
      .values({
        channelId: input.channelId,
        name: input.name,
        token,
        createdBy,
      })
      .returning();

    return { ...webhook, token };
  }

  async listForChannel(channelId: string) {
    return this.db
      .select({
        id: channelWebhooks.id,
        channelId: channelWebhooks.channelId,
        name: channelWebhooks.name,
        enabled: channelWebhooks.enabled,
        createdBy: channelWebhooks.createdBy,
        createdAt: channelWebhooks.createdAt,
      })
      .from(channelWebhooks)
      .where(eq(channelWebhooks.channelId, channelId));
  }

  async ingest(token: string, payload: WebhookPayloadInput) {
    // Look up webhook by token
    const [webhook] = await this.db
      .select()
      .from(channelWebhooks)
      .where(eq(channelWebhooks.token, token))
      .limit(1);

    if (!webhook) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Invalid webhook token', 404);
    }

    if (!webhook.enabled) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Webhook is disabled', 403);
    }

    // Create message in the channel from the webhook creator's account
    const senderName = payload.senderName ?? webhook.name;
    const [message] = await this.db
      .insert(messages)
      .values({
        channelId: webhook.channelId,
        senderId: webhook.createdBy,
        content: `**[${senderName}]** ${payload.content}`,
        mentions: [],
        payload: { type: 'webhook', webhookId: webhook.id, webhookName: webhook.name },
      })
      .returning();

    // Broadcast to channel
    connectionManager.broadcast('message.new', message);

    return message;
  }

  async delete(webhookId: string) {
    await this.db
      .delete(channelWebhooks)
      .where(eq(channelWebhooks.id, webhookId));
  }

  async toggle(webhookId: string, enabled: boolean) {
    const [updated] = await this.db
      .update(channelWebhooks)
      .set({ enabled })
      .where(eq(channelWebhooks.id, webhookId))
      .returning();

    if (!updated) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Webhook not found', 404);
    }

    return updated;
  }
}
