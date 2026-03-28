import { eq, and, sql } from 'drizzle-orm';
import { reactions } from '@lobster-roll/db';
import { SEMANTIC_REACTIONS } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { connectionManager } from './connection-manager.js';

export class ReactionService {
  constructor(private db: Database) {}

  async toggle(messageId: string, accountId: string, emoji: string) {
    // Check if reaction already exists
    const [existing] = await this.db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.accountId, accountId),
          eq(reactions.emoji, emoji),
        ),
      )
      .limit(1);

    if (existing) {
      // Remove it
      await this.db.delete(reactions).where(eq(reactions.id, existing.id));
      connectionManager.broadcast('reaction.removed', { messageId, accountId, emoji });
      return { action: 'removed' as const };
    }

    // Add it
    const semanticMeaning = (SEMANTIC_REACTIONS as Record<string, string>)[emoji] ?? null;
    const [reaction] = await this.db
      .insert(reactions)
      .values({ messageId, accountId, emoji, semanticMeaning })
      .returning();

    connectionManager.broadcast('reaction.added', reaction);
    return { action: 'added' as const, reaction };
  }

  async getForMessage(messageId: string) {
    const rows = await this.db
      .select()
      .from(reactions)
      .where(eq(reactions.messageId, messageId));

    // Group by emoji
    const grouped = new Map<string, { emoji: string; semanticMeaning: string | null; accountIds: string[] }>();
    for (const row of rows) {
      const existing = grouped.get(row.emoji);
      if (existing) {
        existing.accountIds.push(row.accountId);
      } else {
        grouped.set(row.emoji, {
          emoji: row.emoji,
          semanticMeaning: row.semanticMeaning,
          accountIds: [row.accountId],
        });
      }
    }

    return [...grouped.values()].map((g) => ({
      ...g,
      count: g.accountIds.length,
    }));
  }

  async getBulkForMessages(messageIds: string[]) {
    if (messageIds.length === 0) return new Map<string, typeof result>();

    const rows = await this.db
      .select()
      .from(reactions)
      .where(sql`${reactions.messageId} = ANY(${messageIds})`);

    // Group by messageId → emoji
    const result = new Map<string, Map<string, { emoji: string; semanticMeaning: string | null; accountIds: string[] }>>();
    for (const row of rows) {
      if (!result.has(row.messageId)) result.set(row.messageId, new Map());
      const msgMap = result.get(row.messageId)!;
      const existing = msgMap.get(row.emoji);
      if (existing) {
        existing.accountIds.push(row.accountId);
      } else {
        msgMap.set(row.emoji, {
          emoji: row.emoji,
          semanticMeaning: row.semanticMeaning,
          accountIds: [row.accountId],
        });
      }
    }

    return result;
  }
}
