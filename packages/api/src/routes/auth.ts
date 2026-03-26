import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import {
  accounts,
  workspaces,
  channels,
  channelSubscriptions,
  invitations,
} from '@lobster-roll/db';
import {
  AppError,
  ErrorCodes,
  setupWorkspaceSchema,
  acceptInvitationSchema,
  DEFAULT_HUMAN_PERMISSIONS,
  type PermissionScope,
} from '@lobster-roll/shared';
import { requireSupabaseUser } from '../middleware/require-supabase-user.js';
import { requireAuth } from '../middleware/require-auth.js';
import { generateApiKey } from '../utils/api-key.js';
import { InvitationService } from '../services/invitation.service.js';

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/auth/me — First call after login.
   * Returns Supabase user info, LR accounts, and pending invitations.
   */
  fastify.get('/v1/auth/me', { preHandler: [requireSupabaseUser] }, async (request, reply) => {
    const { id: supabaseUserId, email } = request.supabaseUser!;

    // Find all LR accounts for this Supabase user
    const userAccounts = await fastify.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.ownerId, supabaseUserId), eq(accounts.status, 'active')));

    // Find workspaces for each account
    const accountsWithWorkspace = await Promise.all(
      userAccounts.map(async (account) => {
        const [workspace] = await fastify.db
          .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
          .from(workspaces)
          .where(eq(workspaces.id, account.workspaceId))
          .limit(1);
        return { ...account, workspace };
      }),
    );

    // Find pending invitations by email
    const invitationService = new InvitationService(fastify.db);
    const pendingInvitations = await invitationService.getPendingByEmail(email);

    // Enrich invitations with workspace names
    const enrichedInvitations = await Promise.all(
      pendingInvitations.map(async (inv) => {
        const [workspace] = await fastify.db
          .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
          .from(workspaces)
          .where(eq(workspaces.id, inv.workspaceId))
          .limit(1);
        return { ...inv, workspace };
      }),
    );

    return reply.send({
      supabaseUser: { id: supabaseUserId, email },
      accounts: accountsWithWorkspace,
      pendingInvitations: enrichedInvitations,
    });
  });

  /**
   * POST /v1/auth/setup-workspace — Creates workspace + admin account + #general channel.
   */
  fastify.post(
    '/v1/auth/setup-workspace',
    { preHandler: [requireSupabaseUser] },
    async (request, reply) => {
      const body = setupWorkspaceSchema.parse(request.body);
      const { id: supabaseUserId, email } = request.supabaseUser!;

      // Check slug uniqueness
      const [existing] = await fastify.db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, body.slug))
        .limit(1);

      if (existing) {
        throw new AppError(ErrorCodes.WORKSPACE_SLUG_TAKEN, 'Workspace slug already taken', 409);
      }

      // Transaction: create workspace, account, #general channel, subscribe
      const result = await fastify.db.transaction(async (tx) => {
        const [workspace] = await tx
          .insert(workspaces)
          .values({
            name: body.workspaceName,
            slug: body.slug,
            ownerId: supabaseUserId,
          })
          .returning();

        const adminPermissions: PermissionScope[] = [
          'workspace:admin',
          ...DEFAULT_HUMAN_PERMISSIONS,
        ];

        const [account] = await tx
          .insert(accounts)
          .values({
            workspaceId: workspace.id,
            displayName: body.displayName,
            accountType: 'human',
            ownerId: supabaseUserId,
            authMethod: 'supabase',
            permissions: adminPermissions,
            metadata: { email },
          })
          .returning();

        const [channel] = await tx
          .insert(channels)
          .values({
            workspaceId: workspace.id,
            name: 'general',
            channelType: 'text',
            visibility: 'public',
            topic: 'General discussion',
          })
          .returning();

        await tx.insert(channelSubscriptions).values({
          channelId: channel.id,
          accountId: account.id,
          role: 'admin',
        });

        return { workspace, account, channel };
      });

      return reply.status(201).send(result);
    },
  );

  /**
   * POST /v1/auth/accept-invitation — Accepts an invite, creates account in workspace.
   */
  fastify.post(
    '/v1/auth/accept-invitation',
    { preHandler: [requireSupabaseUser] },
    async (request, reply) => {
      const body = acceptInvitationSchema.parse(request.body);
      const { id: supabaseUserId, email } = request.supabaseUser!;

      const invitationService = new InvitationService(fastify.db);
      const invitation = await invitationService.getByToken(body.token);

      // Validate
      if (invitation.status !== 'pending') {
        throw new AppError(ErrorCodes.INVITATION_EXPIRED, 'Invitation is no longer valid', 410);
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        throw new AppError(ErrorCodes.INVITATION_EXPIRED, 'Invitation has expired', 410);
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new AppError(
          ErrorCodes.INVITATION_EMAIL_MISMATCH,
          'Invitation email does not match your account',
          403,
        );
      }

      // Check if already in workspace
      const [existingAccount] = await fastify.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.workspaceId, invitation.workspaceId),
            eq(accounts.ownerId, supabaseUserId),
          ),
        )
        .limit(1);

      if (existingAccount) {
        throw new AppError(
          ErrorCodes.ALREADY_IN_WORKSPACE,
          'You already have an account in this workspace',
          409,
        );
      }

      // Create account + mark invitation accepted in transaction
      const result = await fastify.db.transaction(async (tx) => {
        const permissions: PermissionScope[] =
          invitation.role === 'admin'
            ? ['workspace:admin', ...DEFAULT_HUMAN_PERMISSIONS]
            : [...DEFAULT_HUMAN_PERMISSIONS];

        const [account] = await tx
          .insert(accounts)
          .values({
            workspaceId: invitation.workspaceId,
            displayName: email.split('@')[0],
            accountType: 'human',
            ownerId: supabaseUserId,
            authMethod: 'supabase',
            permissions,
            metadata: { email },
          })
          .returning();

        await tx
          .update(invitations)
          .set({ status: 'accepted' })
          .where(eq(invitations.id, invitation.id));

        // Subscribe to all public channels
        const publicChannels = await tx
          .select({ id: channels.id })
          .from(channels)
          .where(
            and(
              eq(channels.workspaceId, invitation.workspaceId),
              eq(channels.visibility, 'public'),
            ),
          );

        if (publicChannels.length > 0) {
          await tx.insert(channelSubscriptions).values(
            publicChannels.map((ch) => ({
              channelId: ch.id,
              accountId: account.id,
              role: 'member' as const,
            })),
          );
        }

        return { account };
      });

      return reply.status(201).send(result);
    },
  );

  /**
   * POST /v1/auth/generate-api-key — Generates API key for the current human account.
   */
  fastify.post(
    '/v1/auth/generate-api-key',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id, accountType } = request.currentAccount!;

      if (accountType !== 'human') {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Only human accounts can generate API keys', 403);
      }

      const { raw, hashed } = generateApiKey();

      await fastify.db
        .update(accounts)
        .set({ apiKeyHash: hashed, authMethod: 'api_key' })
        .where(eq(accounts.id, id));

      return reply.send({ apiKey: raw });
    },
  );
}
