import type { FastifyInstance } from 'fastify';
import { createMessageSchema, listMessagesSchema } from '@lobster-roll/shared';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { MessageService } from '../services/message.service.js';
import { ChannelService } from '../services/channel.service.js';

export default async function messageRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  fastify.post(
    '/v1/messages',
    { preHandler: [...preHandler, requirePermission('message:write')] },
    async (request, reply) => {
      const body = createMessageSchema.parse(request.body);

      // Validate sender is subscribed to channel
      const channelService = new ChannelService(fastify.db);
      const isSubscribed = await channelService.isSubscribed(
        body.channelId,
        request.currentAccount!.id,
      );
      if (!isSubscribed) {
        throw new AppError(ErrorCodes.NOT_SUBSCRIBED, 'You are not subscribed to this channel', 403);
      }

      const service = new MessageService(fastify.db, fastify.redis);
      const result = await service.send(body, request.currentAccount!.id);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    '/v1/messages',
    { preHandler: [...preHandler, requirePermission('message:read')] },
    async (request, reply) => {
      const query = listMessagesSchema.parse(request.query);
      const service = new MessageService(fastify.db, fastify.redis);
      const messagesList = await service.list(query);
      return reply.send(messagesList);
    },
  );
}
