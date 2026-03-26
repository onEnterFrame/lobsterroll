import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';

export default fp(
  async (fastify: FastifyInstance) => {
    const redis = new Redis(fastify.config.REDIS_URL);
    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async () => {
      await redis.quit();
    });
  },
  { name: 'redis' },
);
