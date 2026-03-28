import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { messages } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { connectionManager } from '../services/connection-manager.js';

export default async function messageActionRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // PATCH /v1/messages/:id — edit a message (only sender can edit)
  fastify.patch(
    '/v1/messages/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { content } = request.body as { content: string };
      const accountId = request.currentAccount!.id;

      const [existing] = await fastify.db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (!existing) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Message not found', 404);
      }
      if (existing.senderId !== accountId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Can only edit your own messages', 403);
      }
      if (existing.deletedAt) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot edit a deleted message', 403);
      }

      const [updated] = await fastify.db
        .update(messages)
        .set({ content, editedAt: new Date() })
        .where(eq(messages.id, id))
        .returning();

      connectionManager.broadcast('message.edited', updated);
      return reply.send(updated);
    },
  );

  // DELETE /v1/messages/:id — soft delete (only sender or admin)
  fastify.delete(
    '/v1/messages/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const accountId = request.currentAccount!.id;
      const perms = request.currentAccount!.permissions as string[];

      const [existing] = await fastify.db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (!existing) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Message not found', 404);
      }
      if (existing.senderId !== accountId && !perms.includes('workspace:admin')) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Can only delete your own messages', 403);
      }

      const [updated] = await fastify.db
        .update(messages)
        .set({
          content: '[deleted]',
          deletedAt: new Date(),
          attachments: [],
        })
        .where(eq(messages.id, id))
        .returning();

      connectionManager.broadcast('message.deleted', { id, channelId: existing.channelId });
      return reply.status(200).send({ ok: true });
    },
  );
}
