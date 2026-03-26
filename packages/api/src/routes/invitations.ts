import type { FastifyInstance } from 'fastify';
import { createInvitationSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { requirePermission } from '../middleware/require-permission.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { InvitationService } from '../services/invitation.service.js';

export default async function invitationRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/invitations — Create invitation (admin only)
   */
  fastify.post(
    '/v1/invitations',
    { preHandler: [requireAuth, workspaceContext, requirePermission('workspace:admin')] },
    async (request, reply) => {
      const body = createInvitationSchema.parse(request.body);
      const service = new InvitationService(fastify.db);

      const invitation = await service.create(
        body,
        request.workspaceId!,
        request.currentAccount!.id,
      );

      const inviteUrl = `${fastify.config.WEB_URL}/invite/${invitation.token}`;

      return reply.status(201).send({ invitation, inviteUrl });
    },
  );

  /**
   * GET /v1/invitations — List pending invitations (admin only)
   */
  fastify.get(
    '/v1/invitations',
    { preHandler: [requireAuth, workspaceContext, requirePermission('workspace:admin')] },
    async (request, reply) => {
      const service = new InvitationService(fastify.db);
      const pending = await service.listPending(request.workspaceId!);
      return reply.send(pending);
    },
  );

  /**
   * DELETE /v1/invitations/:id — Revoke invitation (admin only)
   */
  fastify.delete(
    '/v1/invitations/:id',
    { preHandler: [requireAuth, workspaceContext, requirePermission('workspace:admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new InvitationService(fastify.db);
      await service.revoke(id, request.workspaceId!);
      return reply.status(204).send();
    },
  );

  /**
   * GET /v1/invitations/by-token/:token — Public endpoint to get invitation details
   */
  fastify.get('/v1/invitations/by-token/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const service = new InvitationService(fastify.db);
    const invitation = await service.getByToken(token);

    // Don't expose the token in response, just metadata
    const { token: _token, ...safe } = invitation;

    // Get workspace name
    const { eq } = await import('drizzle-orm');
    const { workspaces } = await import('@lobster-roll/db');
    const [workspace] = await fastify.db
      .select({ name: workspaces.name, slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, invitation.workspaceId))
      .limit(1);

    return reply.send({ ...safe, workspace });
  });
}
