import type { FastifyInstance } from 'fastify';
import { decideApprovalSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { ApprovalService } from '../services/approval.service.js';

export default async function approvalRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  fastify.get(
    '/v1/approvals/pending',
    { preHandler: [...preHandler, requirePermission('approval:manage')] },
    async (request, reply) => {
      const service = new ApprovalService(fastify.db);
      const pending = await service.listPending(request.workspaceId!);
      return reply.send(pending);
    },
  );

  fastify.post(
    '/v1/approvals/:id/decide',
    { preHandler: [...preHandler, requirePermission('approval:manage')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = decideApprovalSchema.parse(request.body);
      const service = new ApprovalService(fastify.db);
      const result = await service.decide(id, body.decision, request.currentAccount!.id);
      return reply.send(result);
    },
  );
}
