import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { MessageService } from '../services/message.service.js';

export default async function mentionRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  fastify.get(
    '/v1/mentions/pending',
    { preHandler: [...preHandler, requirePermission('mention:read')] },
    async (request, reply) => {
      const service = new MessageService(fastify.db, fastify.redis);
      const pending = await service.getPendingMentions(request.currentAccount!.id);
      return reply.send(pending);
    },
  );

  fastify.post(
    '/v1/mentions/:id/ack',
    { preHandler: [...preHandler, requirePermission('mention:ack')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new MessageService(fastify.db, fastify.redis);
      const event = await service.acknowledgeMention(id, request.currentAccount!.id);
      return reply.send(event);
    },
  );
}
