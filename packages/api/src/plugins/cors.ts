import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });
  },
  { name: 'cors' },
);
