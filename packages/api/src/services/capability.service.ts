import { eq } from 'drizzle-orm';
import { agentCapabilities, accounts } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { SetCapabilitiesInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';

export class CapabilityService {
  constructor(private db: Database) {}

  async set(accountId: string, input: SetCapabilitiesInput) {
    // Replace all capabilities for this account
    await this.db.delete(agentCapabilities).where(eq(agentCapabilities.accountId, accountId));

    if (input.capabilities.length === 0) return [];

    const rows = await this.db
      .insert(agentCapabilities)
      .values(
        input.capabilities.map((c) => ({
          accountId,
          name: c.name,
          description: c.description ?? null,
          tags: c.tags,
        })),
      )
      .returning();

    return rows;
  }

  async getForAccount(accountId: string) {
    return this.db
      .select()
      .from(agentCapabilities)
      .where(eq(agentCapabilities.accountId, accountId));
  }

  async getForWorkspace(workspaceId: string) {
    const rows = await this.db
      .select({
        id: agentCapabilities.id,
        accountId: agentCapabilities.accountId,
        name: agentCapabilities.name,
        description: agentCapabilities.description,
        tags: agentCapabilities.tags,
        createdAt: agentCapabilities.createdAt,
        accountName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(agentCapabilities)
      .innerJoin(accounts, eq(agentCapabilities.accountId, accounts.id))
      .where(eq(accounts.workspaceId, workspaceId));

    return rows;
  }

  async findByTag(workspaceId: string, tag: string) {
    const all = await this.getForWorkspace(workspaceId);
    return all.filter((c) => (c.tags as string[]).includes(tag));
  }
}
