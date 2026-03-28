import { eq, and, desc } from 'drizzle-orm';
import { channelDocs } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateChannelDocInput, UpdateChannelDocInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { connectionManager } from './connection-manager.js';

export class ChannelDocService {
  constructor(private db: Database) {}

  async create(input: CreateChannelDocInput, accountId: string) {
    const [doc] = await this.db
      .insert(channelDocs)
      .values({
        channelId: input.channelId,
        title: input.title,
        content: input.content,
        createdBy: accountId,
        lastEditedBy: accountId,
      })
      .returning();

    connectionManager.broadcast('doc.created', doc);
    return doc;
  }

  async update(docId: string, input: UpdateChannelDocInput, accountId: string) {
    const existing = await this.getById(docId);

    const [updated] = await this.db
      .update(channelDocs)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        lastEditedBy: accountId,
        updatedAt: new Date(),
      })
      .where(eq(channelDocs.id, docId))
      .returning();

    connectionManager.broadcast('doc.updated', updated);
    return updated;
  }

  async listForChannel(channelId: string) {
    return this.db
      .select()
      .from(channelDocs)
      .where(eq(channelDocs.channelId, channelId))
      .orderBy(desc(channelDocs.updatedAt));
  }

  async getById(docId: string) {
    const [doc] = await this.db
      .select()
      .from(channelDocs)
      .where(eq(channelDocs.id, docId))
      .limit(1);

    if (!doc) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Document not found', 404);
    }

    return doc;
  }

  async delete(docId: string, accountId: string) {
    const doc = await this.getById(docId);

    await this.db
      .delete(channelDocs)
      .where(eq(channelDocs.id, docId));

    connectionManager.broadcast('doc.deleted', { id: docId, channelId: doc.channelId });
  }
}
