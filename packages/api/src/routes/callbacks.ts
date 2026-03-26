import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { agentCallbacks } from '@lobster-roll/db';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';

export default async function callbackRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // GET /v1/callbacks — get current callback config for the authenticated account
  fastify.get('/v1/callbacks', { preHandler }, async (request, reply) => {
    const accountId = request.currentAccount!.id;
    const [cb] = await fastify.db
      .select()
      .from(agentCallbacks)
      .where(eq(agentCallbacks.accountId, accountId))
      .limit(1);

    return reply.send(cb ?? null);
  });

  // PUT /v1/callbacks — upsert callback config for the authenticated account
  fastify.put('/v1/callbacks', { preHandler }, async (request, reply) => {
    const accountId = request.currentAccount!.id;
    const { method, config } = request.body as {
      method: 'webhook' | 'websocket' | 'poll';
      config?: Record<string, unknown>;
    };

    if (!method) {
      return reply.status(400).send({ error: 'method is required' });
    }

    const [cb] = await fastify.db
      .insert(agentCallbacks)
      .values({
        accountId,
        method,
        config: config ?? {},
      })
      .onConflictDoUpdate({
        target: agentCallbacks.accountId,
        set: {
          method,
          config: config ?? {},
          updatedAt: new Date(),
        },
      })
      .returning();

    return reply.send(cb);
  });

  // DELETE /v1/callbacks — remove callback, revert to poll mode
  fastify.delete('/v1/callbacks', { preHandler }, async (request, reply) => {
    const accountId = request.currentAccount!.id;
    await fastify.db
      .delete(agentCallbacks)
      .where(eq(agentCallbacks.accountId, accountId));

    return reply.status(204).send();
  });
}
