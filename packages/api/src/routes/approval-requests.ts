import type { FastifyInstance } from 'fastify';
import { createApprovalRequestSchema } from '@lobster-roll/shared';
import { messages, approvals } from '@lobster-roll/db';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { connectionManager } from '../services/connection-manager.js';

export default async function approvalRequestRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/approval-requests — create an inline approval request in a channel
  fastify.post(
    '/v1/approval-requests',
    { preHandler },
    async (request, reply) => {
      const body = createApprovalRequestSchema.parse(request.body);
      const accountId = request.currentAccount!.id;
      const workspaceId = request.workspaceId!;

      // Create the message
      const [message] = await fastify.db
        .insert(messages)
        .values({
          channelId: body.channelId,
          senderId: accountId,
          content: body.description,
          mentions: [],
          payload: { type: 'approval_request', actionType: body.actionType },
        })
        .returning();

      // Create the approval record
      const [approval] = await fastify.db
        .insert(approvals)
        .values({
          workspaceId,
          requesterId: accountId,
          actionType: body.actionType,
          actionData: {
            ...body.actionData,
            messageId: message.id,
            channelId: body.channelId,
            description: body.description,
          },
          status: 'pending',
        })
        .returning();

      // Broadcast
      connectionManager.broadcast('message.new', message);
      connectionManager.broadcast('approval.requested', approval);

      return reply.status(201).send({ message, approval });
    },
  );
}
