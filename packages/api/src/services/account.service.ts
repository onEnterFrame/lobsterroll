import { eq, and, count } from 'drizzle-orm';
import { accounts, agentCallbacks, approvals, mentionEvents, channels, channelSubscriptions } from '@lobster-roll/db';
import {
  AppError,
  ErrorCodes,
  MAX_AGENTS_PER_PARENT,
  DEFAULT_HUMAN_PERMISSIONS,
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_SUB_AGENT_PERMISSIONS,
} from '@lobster-roll/shared';
import type { CreateAccountInput, UpdateAccountInput, PermissionScope } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { generateApiKey } from '../utils/api-key.js';

export class AccountService {
  constructor(private db: Database) {}

  async create(
    input: CreateAccountInput,
    workspaceId: string,
    createdBy: string | null,
    provisioningMode: string,
  ) {
    // In supervised mode, agent creation creates an approval request instead
    if (
      provisioningMode === 'supervised' &&
      input.accountType !== 'human' &&
      createdBy !== null
    ) {
      const [approval] = await this.db
        .insert(approvals)
        .values({
          workspaceId,
          requesterId: createdBy,
          actionType: 'create_account',
          actionData: { ...input, workspaceId },
          status: 'pending',
        })
        .returning();

      return { approval, pending: true };
    }

    if (provisioningMode === 'locked' && input.accountType !== 'human') {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'Agent provisioning is locked in this workspace',
        403,
      );
    }

    // Parent chain validation
    if (input.parentId) {
      const parent = await this.getById(input.parentId);

      // Check parent is in same workspace
      if (parent.workspaceId !== workspaceId) {
        throw new AppError(ErrorCodes.PARENT_NOT_FOUND, 'Parent not in this workspace', 400);
      }

      // Check max children
      const [{ value: childCount }] = await this.db
        .select({ value: count() })
        .from(accounts)
        .where(eq(accounts.parentId, input.parentId));

      if (childCount >= MAX_AGENTS_PER_PARENT) {
        throw new AppError(
          ErrorCodes.MAX_AGENTS_EXCEEDED,
          `Parent already has ${MAX_AGENTS_PER_PARENT} agents`,
          400,
        );
      }

      // Check permission escalation
      if (input.permissions) {
        const parentPerms = parent.permissions as string[];
        const escalated = input.permissions.filter((p) => !parentPerms.includes(p));
        if (escalated.length > 0) {
          throw new AppError(
            ErrorCodes.PERMISSION_ESCALATION,
            `Cannot grant permissions parent doesn't have: ${escalated.join(', ')}`,
            400,
          );
        }
      }
    }

    // Resolve default permissions
    const permissions =
      input.permissions ??
      (input.accountType === 'human'
        ? DEFAULT_HUMAN_PERMISSIONS
        : input.accountType === 'agent'
          ? DEFAULT_AGENT_PERMISSIONS
          : DEFAULT_SUB_AGENT_PERMISSIONS);

    // Generate API key for agent accounts
    let apiKeyRaw: string | null = null;
    let apiKeyHash: string | null = null;
    if (input.accountType !== 'human' || input.authMethod === 'api_key') {
      const key = generateApiKey();
      apiKeyRaw = key.raw;
      apiKeyHash = key.hashed;
    }

    const [account] = await this.db
      .insert(accounts)
      .values({
        workspaceId,
        displayName: input.displayName,
        accountType: input.accountType,
        parentId: input.parentId,
        authMethod: input.authMethod,
        apiKeyHash,
        status: 'active',
        permissions,
        metadata: input.metadata,
        createdBy,
      })
      .returning();

    // Set up callback if provided
    if (input.callback) {
      await this.db.insert(agentCallbacks).values({
        accountId: account.id,
        method: input.callback.method,
        config: input.callback.config,
      });
    }

    // Auto-subscribe new agents/sub-agents to #general channel
    if (input.accountType !== 'human') {
      const generalChannel = await this.db
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.workspaceId, workspaceId), eq(channels.name, 'general')))
        .limit(1);

      if (generalChannel[0]) {
        await this.db
          .insert(channelSubscriptions)
          .values({ channelId: generalChannel[0].id, accountId: account.id, role: 'member' })
          .onConflictDoNothing();
      }
    }

    return { account, apiKey: apiKeyRaw, pending: false };
  }

  async batchCreate(
    inputAccounts: CreateAccountInput[],
    workspaceId: string,
    createdBy: string,
    provisioningMode: string,
  ) {
    const results = [];
    for (const input of inputAccounts) {
      const result = await this.create(input, workspaceId, createdBy, provisioningMode);
      results.push(result);
    }
    return results;
  }

  async getById(id: string) {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);

    if (!account) {
      throw new AppError(ErrorCodes.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    return account;
  }

  async update(id: string, input: UpdateAccountInput) {
    const account = await this.getById(id);

    const updateData: Record<string, unknown> = {};
    if (input.displayName !== undefined) updateData.displayName = input.displayName;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.permissions !== undefined) updateData.permissions = input.permissions;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const [updated] = await this.db
      .update(accounts)
      .set(updateData)
      .where(eq(accounts.id, id))
      .returning();

    // Update callback if provided
    if (input.callback) {
      await this.db
        .insert(agentCallbacks)
        .values({
          accountId: id,
          method: input.callback.method,
          config: input.callback.config,
        })
        .onConflictDoUpdate({
          target: agentCallbacks.accountId,
          set: {
            method: input.callback.method,
            config: input.callback.config,
            updatedAt: new Date(),
          },
        });
    }

    return updated;
  }

  async deactivate(id: string) {
    // Cascade deactivation to sub-agents
    await this.cascadeDeactivation(id);

    const [updated] = await this.db
      .update(accounts)
      .set({ status: 'deactivated' })
      .where(eq(accounts.id, id))
      .returning();

    return updated;
  }

  private async cascadeDeactivation(parentId: string) {
    const children = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.parentId, parentId), eq(accounts.status, 'active')));

    for (const child of children) {
      await this.cascadeDeactivation(child.id);
      await this.db
        .update(accounts)
        .set({ status: 'deactivated' })
        .where(eq(accounts.id, child.id));
    }
  }

  async getRoster(workspaceId: string) {
    const allAccounts = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.workspaceId, workspaceId));

    // Build parent→children map
    const childrenMap = new Map<string, typeof allAccounts>();
    const topLevel: typeof allAccounts = [];

    for (const account of allAccounts) {
      if (account.parentId) {
        if (!childrenMap.has(account.parentId)) childrenMap.set(account.parentId, []);
        childrenMap.get(account.parentId)!.push(account);
      } else {
        topLevel.push(account);
      }
    }

    // Return RosterEntry[] — top-level accounts with nested children
    return topLevel.map((account) => ({
      ...account,
      children: childrenMap.get(account.id) ?? [],
    }));
  }
}
