import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { SearchService } from '../services/search.service.js';

export default async function searchRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // GET /v1/search?q=...&channelId=...&senderId=...&after=...&before=...&hasAttachment=true
  fastify.get(
    '/v1/search',
    { preHandler },
    async (request, reply) => {
      const query = request.query as Record<string, string>;
      if (!query.q) {
        return reply.status(400).send({ error: 'q (query) is required' });
      }

      const service = new SearchService(fastify.db);
      const results = await service.search(request.workspaceId!, {
        query: query.q,
        channelId: query.channelId,
        senderId: query.senderId,
        after: query.after,
        before: query.before,
        hasAttachment: query.hasAttachment === 'true',
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      });

      return reply.send(results);
    },
  );
}
