import type { FastifyInstance } from 'fastify';
import { createWorkspaceSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { WorkspaceService } from '../services/workspace.service.js';

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
}
