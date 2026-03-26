import fp from 'fastify-plugin';
import { createDb } from '@lobster-roll/db';
import type { FastifyInstance } from 'fastify';

export default fp(
  async (fastify: FastifyInstance) => {
    const db = createDb(fastify.config.DATABASE_URL);
    fastify.decorate('db', db);
  },
  { name: 'database' },
);
