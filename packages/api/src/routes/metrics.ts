import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { MetricsService } from '../services/metrics.service.js';

export default async function metricsRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // GET /v1/metrics — all agent metrics for workspace
  fastify.get(
    '/v1/metrics',
    { preHandler },
    async (request, reply) => {
      const service = new MetricsService(fastify.db);
      const metrics = await service.getForWorkspace(request.workspaceId!);
      return reply.send(metrics);
    },
  );

  // GET /v1/metrics/:accountId — single agent metrics
  fastify.get(
    '/v1/metrics/:accountId',
    { preHandler },
    async (request, reply) => {
      const { accountId } = request.params as { accountId: string };
      const service = new MetricsService(fastify.db);
      const metrics = await service.getForAccount(accountId);
      return reply.send(metrics);
    },
  );
}
