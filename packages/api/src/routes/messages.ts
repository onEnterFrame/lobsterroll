import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { messages } from '@lobster-roll/db';
import { createMessageSchema, listMessagesSchema } from '@lobster-roll/shared';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { MessageService } from '../services/message.service.js';
import { ChannelService } from '../services/channel.service.js';
import { connectionManager } from '../services/connection-manager.js';

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

      const service = new MessageService(fastify.db, fastify.redis, undefined, connectionManager);
      const result = await service.send(body, request.currentAccount!.id);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    '/v1/messages',
    { preHandler: [...preHandler, requirePermission('message:read')] },
    async (request, reply) => {
      const raw = request.query as Record<string, string>;
      // Map frontend's 'cursor' param to API's 'before' param
      if (raw.cursor && !raw.before) {
        raw.before = raw.cursor;
      }
      const query = listMessagesSchema.parse(raw);
      const service = new MessageService(fastify.db, fastify.redis);
      const messagesList = await service.list(query);

      // Determine next cursor (last message ID if we got a full page)
      const nextCursor =
        messagesList.length === query.limit
          ? messagesList[messagesList.length - 1].id
          : null;

      return reply.send({ messages: messagesList, nextCursor });
    },
  );

  fastify.get(
    '/v1/messages/:id',
    { preHandler: [...preHandler, requirePermission('message:read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [message] = await fastify.db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (!message) {
        throw new AppError(ErrorCodes.MESSAGE_NOT_FOUND, 'Message not found', 404);
      }

      return reply.send(message);
    },
  );
}
