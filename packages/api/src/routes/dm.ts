import type { FastifyInstance } from 'fastify';
import { eq, and, or, sql } from 'drizzle-orm';
import { channels, channelSubscriptions, accounts } from '@lobster-roll/db';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { ChannelService } from '../services/channel.service.js';

export default async function dmRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/channels/dm — create or get existing DM channel between two accounts
  fastify.post(
    '/v1/channels/dm',
    { preHandler },
    async (request, reply) => {
      const { targetAccountId } = request.body as { targetAccountId: string };
      const myId = request.currentAccount!.id;
      const workspaceId = request.workspaceId!;

      if (!targetAccountId) {
        return reply.status(400).send({ error: 'targetAccountId is required' });
      }

      if (targetAccountId === myId) {
        return reply.status(400).send({ error: 'Cannot DM yourself' });
      }

      // Verify target exists in same workspace
      const [target] = await fastify.db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, targetAccountId), eq(accounts.workspaceId, workspaceId)))
        .limit(1);

      if (!target) {
        return reply.status(404).send({ error: 'Target account not found' });
      }

      // Check if DM channel already exists between these two accounts
      // DM channels have a specific naming pattern: dm:{sortedId1}:{sortedId2}
      const sortedIds = [myId, targetAccountId].sort();
      const dmSlug = `dm:${sortedIds[0]}:${sortedIds[1]}`;

      const existingChannels = await fastify.db
        .select()
        .from(channels)
        .where(and(
          eq(channels.workspaceId, workspaceId),
          eq(channels.topic, dmSlug),
        ))
        .limit(1);

      if (existingChannels.length > 0) {
        return reply.send(existingChannels[0]);
      }

      // Create new DM channel
      const myName = request.currentAccount!.displayName;
      const targetName = target.displayName;

      const channelService = new ChannelService(fastify.db);
      const dmChannel = await channelService.create({
        name: `${myName} ↔ ${targetName}`,
        channelType: 'text',
        visibility: 'private',
        topic: dmSlug,
      }, workspaceId);

      // Auto-subscribe both accounts
      await channelService.subscribe(dmChannel.id, [myId, targetAccountId], workspaceId);

      return reply.status(201).send(dmChannel);
    },
  );
}
