import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { readReceipts, accounts } from '@lobster-roll/db';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';

export default async function readReceiptRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // PUT /v1/channels/:channelId/read — mark channel as read up to a message
  fastify.put(
    '/v1/channels/:channelId/read',
    { preHandler },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { messageId } = request.body as { messageId: string };
      const accountId = request.currentAccount!.id;

      await fastify.db
        .insert(readReceipts)
        .values({
          channelId,
          accountId,
          lastReadMessageId: messageId,
          readAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [readReceipts.channelId, readReceipts.accountId],
          set: {
            lastReadMessageId: messageId,
            readAt: new Date(),
          },
        });

      return reply.send({ ok: true });
    },
  );

  // GET /v1/channels/:channelId/readers — who has read what in this channel
  fastify.get(
    '/v1/channels/:channelId/readers',
    { preHandler },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };

      const readers = await fastify.db
        .select({
          accountId: readReceipts.accountId,
          lastReadMessageId: readReceipts.lastReadMessageId,
          readAt: readReceipts.readAt,
          displayName: accounts.displayName,
        })
        .from(readReceipts)
        .innerJoin(accounts, eq(readReceipts.accountId, accounts.id))
        .where(eq(readReceipts.channelId, channelId));

      return reply.send(readers);
    },
  );
}
