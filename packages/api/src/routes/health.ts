import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/ready', async (request, reply) => {
    try {
      // Check database
      await fastify.db.execute(
        // @ts-expect-error raw SQL check
        { sql: 'SELECT 1', params: [] },
      );
    } catch {
      return reply.status(503).send({ status: 'not_ready', reason: 'database' });
    }

    try {
      // Check redis
      await fastify.redis.ping();
    } catch {
      return reply.status(503).send({ status: 'not_ready', reason: 'redis' });
    }

    return { status: 'ready' };
  });
}
