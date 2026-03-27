import { eq, and } from 'drizzle-orm';
import { channels, channelSubscriptions, accounts } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateChannelInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';

export class ChannelService {
  constructor(private db: Database) {}

  async create(input: CreateChannelInput, workspaceId: string) {
    const [channel] = await this.db
      .insert(channels)
      .values({
        workspaceId,
        name: input.name,
        channelType: input.channelType,
        visibility: input.visibility,
        topic: input.topic,
      })
      .returning();

    return channel;
  }

  async list(workspaceId: string, accountPermissions: string[]) {
    const allChannels = await this.db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId));

    // Filter private channels unless account has channel:manage
    if (accountPermissions.includes('channel:manage') || accountPermissions.includes('workspace:admin')) {
      return allChannels;
    }

    return allChannels.filter((c) => c.visibility === 'public');
  }

  async getById(id: string) {
    const [channel] = await this.db
      .select()
      .from(channels)
      .where(eq(channels.id, id))
      .limit(1);

    if (!channel) {
      throw new AppError(ErrorCodes.CHANNEL_NOT_FOUND, 'Channel not found', 404);
    }

    return channel;
  }

  async subscribe(channelId: string, accountIds: string[], workspaceId: string) {
    const channel = await this.getById(channelId);

    if (channel.workspaceId !== workspaceId) {
      throw new AppError(ErrorCodes.CHANNEL_NOT_FOUND, 'Channel not in this workspace', 404);
    }

    const results = [];
    for (const accountId of accountIds) {
      // Verify account exists in workspace
      const [account] = await this.db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, workspaceId)))
        .limit(1);

      if (!account) continue;

      // Check if already subscribed
      const [existing] = await this.db
        .select()
        .from(channelSubscriptions)
        .where(
          and(
            eq(channelSubscriptions.channelId, channelId),
            eq(channelSubscriptions.accountId, accountId),
          ),
        )
        .limit(1);

      if (existing) continue;

      const [sub] = await this.db
        .insert(channelSubscriptions)
        .values({ channelId, accountId, role: 'member' })
        .returning();

      results.push(sub);
    }

    return results;
  }

  async isSubscribed(channelId: string, accountId: string): Promise<boolean> {
    const [sub] = await this.db
      .select()
      .from(channelSubscriptions)
      .where(
        and(
          eq(channelSubscriptions.channelId, channelId),
          eq(channelSubscriptions.accountId, accountId),
        ),
      )
      .limit(1);

    return !!sub;
  }

  async getSubscriberIds(channelId: string): Promise<string[]> {
    const subs = await this.db
      .select({ accountId: channelSubscriptions.accountId })
      .from(channelSubscriptions)
      .where(eq(channelSubscriptions.channelId, channelId));

    return subs.map((s) => s.accountId);
  }
}
