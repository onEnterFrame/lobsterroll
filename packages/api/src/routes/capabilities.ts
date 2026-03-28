import type { FastifyInstance } from 'fastify';
import { setCapabilitiesSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { CapabilityService } from '../services/capability.service.js';

export default async function capabilityRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // PUT /v1/capabilities — set capabilities for current account (replaces all)
  fastify.put(
    '/v1/capabilities',
    { preHandler },
    async (request, reply) => {
      const body = setCapabilitiesSchema.parse(request.body);
      const service = new CapabilityService(fastify.db);
      const capabilities = await service.set(request.currentAccount!.id, body);
      return reply.send(capabilities);
    },
  );

  // GET /v1/capabilities/:accountId — get capabilities for an account
  fastify.get(
    '/v1/capabilities/:accountId',
    { preHandler },
    async (request, reply) => {
      const { accountId } = request.params as { accountId: string };
      const service = new CapabilityService(fastify.db);
      const capabilities = await service.getForAccount(accountId);
      return reply.send(capabilities);
    },
  );

  // GET /v1/capabilities — get all capabilities in workspace
  fastify.get(
    '/v1/capabilities',
    { preHandler },
    async (request, reply) => {
      const query = request.query as { tag?: string };
      const service = new CapabilityService(fastify.db);

      if (query.tag) {
        const filtered = await service.findByTag(request.workspaceId!, query.tag);
        return reply.send(filtered);
      }

      const all = await service.getForWorkspace(request.workspaceId!);
      return reply.send(all);
    },
  );
}
