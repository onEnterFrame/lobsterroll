import { eq, sql } from 'drizzle-orm';
import { agentMetrics, messages, accounts } from '@lobster-roll/db';
import type { Database } from '@lobster-roll/db';

export class MetricsService {
  constructor(private db: Database) {}

  async recordMessage(accountId: string, channelId: string) {
    // Upsert metrics row
    await this.db
      .insert(agentMetrics)
      .values({
        accountId,
        messageCount: 1,
        lastActiveChannelId: channelId,
        lastMessageAt: new Date(),
      })
      .onConflictDoUpdate({
        target: agentMetrics.accountId,
        set: {
          messageCount: sql`(${agentMetrics.messageCount}::int + 1)::jsonb`,
          lastActiveChannelId: channelId,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  async recordTaskCompleted(accountId: string) {
    await this.db
      .insert(agentMetrics)
      .values({
        accountId,
        tasksCompleted: 1,
      })
      .onConflictDoUpdate({
        target: agentMetrics.accountId,
        set: {
          tasksCompleted: sql`(${agentMetrics.tasksCompleted}::int + 1)::jsonb`,
          updatedAt: new Date(),
        },
      });
  }

  async recordTaskAssigned(accountId: string) {
    await this.db
      .insert(agentMetrics)
      .values({
        accountId,
        tasksAssigned: 1,
      })
      .onConflictDoUpdate({
        target: agentMetrics.accountId,
        set: {
          tasksAssigned: sql`(${agentMetrics.tasksAssigned}::int + 1)::jsonb`,
          updatedAt: new Date(),
        },
      });
  }

  async getForAccount(accountId: string) {
    const [metrics] = await this.db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.accountId, accountId))
      .limit(1);

    return metrics ?? {
      accountId,
      messageCount: 0,
      mentionResponseAvgMs: null,
      lastActiveChannelId: null,
      lastMessageAt: null,
      tasksCompleted: 0,
      tasksAssigned: 0,
    };
  }

  async getForWorkspace(workspaceId: string) {
    const rows = await this.db
      .select({
        accountId: agentMetrics.accountId,
        messageCount: agentMetrics.messageCount,
        mentionResponseAvgMs: agentMetrics.mentionResponseAvgMs,
        lastActiveChannelId: agentMetrics.lastActiveChannelId,
        lastMessageAt: agentMetrics.lastMessageAt,
        tasksCompleted: agentMetrics.tasksCompleted,
        tasksAssigned: agentMetrics.tasksAssigned,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(agentMetrics)
      .innerJoin(accounts, eq(agentMetrics.accountId, accounts.id))
      .where(eq(accounts.workspaceId, workspaceId));

    return rows;
  }
}
