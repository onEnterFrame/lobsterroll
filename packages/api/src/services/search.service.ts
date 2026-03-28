import { eq, and, ilike, desc, gte, lte, sql } from 'drizzle-orm';
import { messages, accounts, channels } from '@lobster-roll/db';
import type { Database } from '@lobster-roll/db';

export interface SearchFilters {
  query: string;
  channelId?: string;
  senderId?: string;
  after?: string;
  before?: string;
  hasAttachment?: boolean;
  limit?: number;
}

export class SearchService {
  constructor(private db: Database) {}

  async search(workspaceId: string, filters: SearchFilters) {
    const conditions = [
      eq(channels.workspaceId, workspaceId),
      ilike(messages.content, `%${filters.query}%`),
    ];

    if (filters.channelId) {
      conditions.push(eq(messages.channelId, filters.channelId));
    }
    if (filters.senderId) {
      conditions.push(eq(messages.senderId, filters.senderId));
    }
    if (filters.after) {
      conditions.push(gte(messages.createdAt, new Date(filters.after)));
    }
    if (filters.before) {
      conditions.push(lte(messages.createdAt, new Date(filters.before)));
    }
    if (filters.hasAttachment) {
      conditions.push(sql`jsonb_array_length(${messages.attachments}::jsonb) > 0`);
    }

    const results = await this.db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderId: messages.senderId,
        content: messages.content,
        attachments: messages.attachments,
        createdAt: messages.createdAt,
        channelName: channels.name,
        senderName: accounts.displayName,
      })
      .from(messages)
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .innerJoin(accounts, eq(messages.senderId, accounts.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(filters.limit ?? 50);

    return results;
  }
}
