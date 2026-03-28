import type { FastifyInstance } from 'fastify';
import { createChannelDocSchema, updateChannelDocSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { ChannelDocService } from '../services/channel-doc.service.js';

export default async function channelDocRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/docs — create a new channel doc
  fastify.post(
    '/v1/docs',
    { preHandler },
    async (request, reply) => {
      const body = createChannelDocSchema.parse(request.body);
      const service = new ChannelDocService(fastify.db);
      const doc = await service.create(body, request.currentAccount!.id);
      return reply.status(201).send(doc);
    },
  );

  // GET /v1/docs?channelId=xxx — list docs for a channel
  fastify.get(
    '/v1/docs',
    { preHandler },
    async (request, reply) => {
      const { channelId } = request.query as { channelId: string };
      if (!channelId) {
        return reply.status(400).send({ error: 'channelId is required' });
      }
      const service = new ChannelDocService(fastify.db);
      const docs = await service.listForChannel(channelId);
      return reply.send(docs);
    },
  );

  // GET /v1/docs/:id — get a single doc
  fastify.get(
    '/v1/docs/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new ChannelDocService(fastify.db);
      const doc = await service.getById(id);
      return reply.send(doc);
    },
  );

  // PATCH /v1/docs/:id — update doc title/content
  fastify.patch(
    '/v1/docs/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateChannelDocSchema.parse(request.body);
      const service = new ChannelDocService(fastify.db);
      const doc = await service.update(id, body, request.currentAccount!.id);
      return reply.send(doc);
    },
  );

  // DELETE /v1/docs/:id — delete a doc
  fastify.delete(
    '/v1/docs/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new ChannelDocService(fastify.db);
      await service.delete(id, request.currentAccount!.id);
      return reply.status(204).send();
    },
  );
}
