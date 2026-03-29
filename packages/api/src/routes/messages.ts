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
import { MetricsService } from '../services/metrics.service.js';
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

      // Broadcast channels: only workspace admins can send
      const channelInfo = await channelService.getById(body.channelId);
      if (channelInfo.channelType === 'broadcast') {
        const perms = request.currentAccount!.permissions as string[];
        if (!perms.includes('workspace:admin')) {
          throw new AppError(ErrorCodes.FORBIDDEN, 'Only admins can send to broadcast channels', 403);
        }
      }

      const service = new MessageService(fastify.db, fastify.redis, undefined, connectionManager);
      const result = await service.send(body, request.currentAccount!.id);

      // Track metrics (fire-and-forget)
      const metricsService = new MetricsService(fastify.db);
      metricsService.recordMessage(request.currentAccount!.id, body.channelId).catch(() => {});

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
    '/v1/messages/thread-counts',
    { preHandler: [...preHandler, requirePermission('message:read')] },
    async (request, reply) => {
      const { channelId } = request.query as { channelId?: string };
      if (!channelId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'channelId is required', 400);
      }
      const service = new MessageService(fastify.db, fastify.redis);
      const counts = await service.getThreadCounts(channelId);
      return reply.send(counts);
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
