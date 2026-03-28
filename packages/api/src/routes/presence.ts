import type { FastifyInstance } from 'fastify';
import { updatePresenceSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { PresenceService } from '../services/presence.service.js';

export default async function presenceRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/presence/heartbeat — agents/clients call this periodically
  fastify.post(
    '/v1/presence/heartbeat',
    { preHandler },
    async (request, reply) => {
      const service = new PresenceService(fastify.db);
      const info = await service.heartbeat(request.currentAccount!.id);
      return reply.send(info);
    },
  );

  // PUT /v1/presence/status — set presence status + optional statusMessage
  fastify.put(
    '/v1/presence/status',
    { preHandler },
    async (request, reply) => {
      const body = updatePresenceSchema.parse(request.body);
      const service = new PresenceService(fastify.db);
      const info = await service.updatePresence(
        request.currentAccount!.id,
        body.status,
        body.statusMessage,
      );
      return reply.send(info);
    },
  );

  // GET /v1/presence/:accountId — get single account presence
  fastify.get(
    '/v1/presence/:accountId',
    { preHandler },
    async (request, reply) => {
      const { accountId } = request.params as { accountId: string };
      const service = new PresenceService(fastify.db);
      const info = await service.getPresence(accountId);
      return reply.send(info);
    },
  );

  // GET /v1/presence — bulk presence for all workspace members
  fastify.get(
    '/v1/presence',
    { preHandler },
    async (request, reply) => {
      const service = new PresenceService(fastify.db);
      const presenceList = await service.getBulkPresence(request.workspaceId!);
      return reply.send(presenceList);
    },
  );
}
