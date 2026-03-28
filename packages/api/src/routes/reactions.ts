import type { FastifyInstance } from 'fastify';
import { addReactionSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { ReactionService } from '../services/reaction.service.js';

export default async function reactionRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/reactions — toggle a reaction on a message
  fastify.post(
    '/v1/reactions',
    { preHandler },
    async (request, reply) => {
      const body = addReactionSchema.parse(request.body);
      const service = new ReactionService(fastify.db);
      const result = await service.toggle(body.messageId, request.currentAccount!.id, body.emoji);
      return reply.send(result);
    },
  );

  // GET /v1/reactions/:messageId — get reactions for a message
  fastify.get(
    '/v1/reactions/:messageId',
    { preHandler },
    async (request, reply) => {
      const { messageId } = request.params as { messageId: string };
      const service = new ReactionService(fastify.db);
      const reactions = await service.getForMessage(messageId);
      return reply.send(reactions);
    },
  );
}
