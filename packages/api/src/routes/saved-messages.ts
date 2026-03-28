import type { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { savedMessages, messages, accounts, channels } from '@lobster-roll/db';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';

export default async function savedMessageRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/saved — save a message
  fastify.post(
    '/v1/saved',
    { preHandler },
    async (request, reply) => {
      const { messageId } = request.body as { messageId: string };
      const accountId = request.currentAccount!.id;

      await fastify.db
        .insert(savedMessages)
        .values({ accountId, messageId })
        .onConflictDoNothing();

      return reply.status(201).send({ ok: true });
    },
  );

  // GET /v1/saved — list saved messages
  fastify.get(
    '/v1/saved',
    { preHandler },
    async (request, reply) => {
      const accountId = request.currentAccount!.id;

      const saved = await fastify.db
        .select({
          id: savedMessages.id,
          messageId: savedMessages.messageId,
          savedAt: savedMessages.createdAt,
          content: messages.content,
          senderId: messages.senderId,
          channelId: messages.channelId,
          messageCreatedAt: messages.createdAt,
          senderName: accounts.displayName,
          channelName: channels.name,
        })
        .from(savedMessages)
        .innerJoin(messages, eq(savedMessages.messageId, messages.id))
        .innerJoin(accounts, eq(messages.senderId, accounts.id))
        .innerJoin(channels, eq(messages.channelId, channels.id))
        .where(eq(savedMessages.accountId, accountId))
        .orderBy(desc(savedMessages.createdAt));

      return reply.send(saved);
    },
  );

  // DELETE /v1/saved/:messageId — unsave a message
  fastify.delete(
    '/v1/saved/:messageId',
    { preHandler },
    async (request, reply) => {
      const { messageId } = request.params as { messageId: string };
      const accountId = request.currentAccount!.id;

      await fastify.db
        .delete(savedMessages)
        .where(and(
          eq(savedMessages.accountId, accountId),
          eq(savedMessages.messageId, messageId),
        ));

      return reply.status(204).send();
    },
  );
}
