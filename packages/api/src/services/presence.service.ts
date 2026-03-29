import { eq, inArray } from 'drizzle-orm';
import { accounts, presenceLog } from '@lobster-roll/db';
import type { Database } from '@lobster-roll/db';
import type { PresenceStatus, PresenceInfo } from '@lobster-roll/shared';
import { connectionManager } from './connection-manager.js';

export class PresenceService {
  constructor(private db: Database) {}

  async updatePresence(
    accountId: string,
    status: PresenceStatus,
    statusMessage?: string | null,
  ): Promise<PresenceInfo> {
    const now = new Date();

    // Update the account row
    const [updated] = await this.db
      .update(accounts)
      .set({
        presenceStatus: status,
        statusMessage: statusMessage ?? null,
        lastSeenAt: now,
      })
      .where(eq(accounts.id, accountId))
      .returning({
        id: accounts.id,
        presenceStatus: accounts.presenceStatus,
        statusMessage: accounts.statusMessage,
        lastSeenAt: accounts.lastSeenAt,
        workspaceId: accounts.workspaceId,
      });

    if (!updated) {
      throw new Error('Account not found');
    }

    // Insert presence log entry
    await this.db.insert(presenceLog).values({
      accountId,
      status,
      statusMessage: statusMessage ?? null,
    });

    const info: PresenceInfo = {
      accountId: updated.id,
      status: updated.presenceStatus,
      statusMessage: updated.statusMessage,
      lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
    };

    // Broadcast to all workspace members
    this.broadcastPresenceChange(info, updated.workspaceId);

    return info;
  }

  async heartbeat(accountId: string): Promise<PresenceInfo> {
    const now = new Date();

    const [updated] = await this.db
      .update(accounts)
      .set({
        presenceStatus: 'online',
        lastSeenAt: now,
      })
      .where(eq(accounts.id, accountId))
      .returning({
        id: accounts.id,
        presenceStatus: accounts.presenceStatus,
        statusMessage: accounts.statusMessage,
        lastSeenAt: accounts.lastSeenAt,
        workspaceId: accounts.workspaceId,
      });

    if (!updated) {
      throw new Error('Account not found');
    }

    // Only broadcast if status changed to online (was offline/idle)
    const info: PresenceInfo = {
      accountId: updated.id,
      status: updated.presenceStatus,
      statusMessage: updated.statusMessage,
      lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
    };

    // Always broadcast on heartbeat so clients have fresh lastSeenAt
    this.broadcastPresenceChange(info, updated.workspaceId);

    return info;
  }

  async getPresence(accountId: string): Promise<PresenceInfo> {
    const [account] = await this.db
      .select({
        id: accounts.id,
        presenceStatus: accounts.presenceStatus,
        statusMessage: accounts.statusMessage,
        lastSeenAt: accounts.lastSeenAt,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      accountId: account.id,
      status: account.presenceStatus,
      statusMessage: account.statusMessage,
      lastSeenAt: account.lastSeenAt?.toISOString() ?? null,
    };
  }

  async getBulkPresence(workspaceId: string): Promise<PresenceInfo[]> {
    const rows = await this.db
      .select({
        id: accounts.id,
        presenceStatus: accounts.presenceStatus,
        statusMessage: accounts.statusMessage,
        lastSeenAt: accounts.lastSeenAt,
      })
      .from(accounts)
      .where(eq(accounts.workspaceId, workspaceId));

    return rows.map((row) => ({
      accountId: row.id,
      status: row.presenceStatus,
      statusMessage: row.statusMessage,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    }));
  }

  async setOffline(accountId: string): Promise<void> {
    const [updated] = await this.db
      .update(accounts)
      .set({
        presenceStatus: 'offline',
        lastSeenAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning({
        id: accounts.id,
        presenceStatus: accounts.presenceStatus,
        statusMessage: accounts.statusMessage,
        lastSeenAt: accounts.lastSeenAt,
        workspaceId: accounts.workspaceId,
      });

    if (updated) {
      await this.db.insert(presenceLog).values({
        accountId,
        status: 'offline',
      });

      this.broadcastPresenceChange(
        {
          accountId: updated.id,
          status: 'offline',
          statusMessage: updated.statusMessage,
          lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
        },
        updated.workspaceId,
      );
    }
  }

  private broadcastPresenceChange(info: PresenceInfo, workspaceId: string): void {
    connectionManager.broadcastToWorkspace(workspaceId, 'presence.changed', info);
  }
}
