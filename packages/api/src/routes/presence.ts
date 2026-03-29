import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { accounts } from '@lobster-roll/db';
import { updatePresenceSchema } from '@lobster-roll/shared';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
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

      // Verify the target account belongs to the requester's workspace (return 404 to avoid leaking existence)
      const [targetAccount] = await fastify.db
        .select({ workspaceId: accounts.workspaceId })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (!targetAccount || targetAccount.workspaceId !== request.workspaceId!) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Account not found', 404);
      }

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
