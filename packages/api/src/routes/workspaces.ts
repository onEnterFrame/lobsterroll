import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { workspaces } from '@lobster-roll/db';
import { createWorkspaceSchema, AppError, ErrorCodes } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { generateProvisionToken } from '../utils/provision-token.js';

export default async function workspaceRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/v1/workspaces',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = createWorkspaceSchema.parse(request.body);
      const service = new WorkspaceService(fastify.db);
      const workspace = await service.create(body, request.currentAccount!.id);
      return reply.status(201).send(workspace);
    },
  );

  fastify.get(
    '/v1/workspaces/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new WorkspaceService(fastify.db);
      const workspace = await service.getById(id);
      return reply.send(workspace);
    },
  );

  /**
   * POST /v1/workspaces/:id/rotate-provision-token — Admin-only, rotates the agent provision token.
   */
  fastify.post(
    '/v1/workspaces/:id/rotate-provision-token',
    { preHandler: [requireAuth, workspaceContext, requirePermission('workspace:admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verify the workspace matches the current account's workspace
      if (id !== request.workspaceId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot modify another workspace', 403);
      }

      const newToken = generateProvisionToken();

      const [updated] = await fastify.db
        .update(workspaces)
        .set({ agentProvisionToken: newToken, updatedAt: new Date() })
        .where(eq(workspaces.id, id))
        .returning();

      if (!updated) {
        throw new AppError(ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found', 404);
      }

      return reply.send({ agentProvisionToken: newToken });
    },
  );
}
