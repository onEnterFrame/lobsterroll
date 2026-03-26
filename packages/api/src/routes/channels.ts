import type { FastifyInstance } from 'fastify';
import { createChannelSchema, subscribeChannelSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { ChannelService } from '../services/channel.service.js';

export default async function channelRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  fastify.post(
    '/v1/channels',
    { preHandler: [...preHandler, requirePermission('channel:manage')] },
    async (request, reply) => {
      const body = createChannelSchema.parse(request.body);
      const service = new ChannelService(fastify.db);
      const channel = await service.create(body, request.workspaceId!);
      return reply.status(201).send(channel);
    },
  );

  fastify.get(
    '/v1/channels',
    { preHandler },
    async (request, reply) => {
      const service = new ChannelService(fastify.db);
      const channelsList = await service.list(
        request.workspaceId!,
        request.currentAccount!.permissions,
      );
      return reply.send(channelsList);
    },
  );

  fastify.post(
    '/v1/channels/:id/subscribe',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = subscribeChannelSchema.parse(request.body);
      const service = new ChannelService(fastify.db);
      const subscriptions = await service.subscribe(id, body.accountIds, request.workspaceId!);
      return reply.status(201).send(subscriptions);
    },
  );
}
