import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentSetupMd = readFileSync(join(__dirname, 'agent-setup.md'), 'utf-8');

export default async function healthRoutes(fastify: FastifyInstance) {
  /** Serve agent onboarding doc — no auth required, intended for agents bootstrapping. */
  fastify.get('/agent-setup.md', async (_request, reply) => {
    return reply.type('text/markdown; charset=utf-8').send(agentSetupMd);
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/ready', async (request, reply) => {
    try {
      // Check database
      await fastify.db.execute(
        { sql: 'SELECT 1', params: [] } as never,
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
