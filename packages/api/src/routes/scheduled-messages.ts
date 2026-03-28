import type { FastifyInstance } from 'fastify';
import { createScheduledMessageSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { ScheduledMessageService } from '../services/scheduled-message.service.js';

export default async function scheduledMessageRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/scheduled-messages — create a scheduled message
  fastify.post(
    '/v1/scheduled-messages',
    { preHandler },
    async (request, reply) => {
      const body = createScheduledMessageSchema.parse(request.body);
      const service = new ScheduledMessageService(fastify.db);
      const scheduled = await service.create(body, request.currentAccount!.id);
      return reply.status(201).send(scheduled);
    },
  );

  // GET /v1/scheduled-messages — list your scheduled messages
  fastify.get(
    '/v1/scheduled-messages',
    { preHandler },
    async (request, reply) => {
      const service = new ScheduledMessageService(fastify.db);
      const list = await service.listForSender(request.currentAccount!.id);
      return reply.send(list);
    },
  );

  // PUT /v1/scheduled-messages/:id/toggle — enable/disable
  fastify.put(
    '/v1/scheduled-messages/:id/toggle',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { enabled } = request.body as { enabled: boolean };
      const service = new ScheduledMessageService(fastify.db);
      const updated = await service.toggle(id, request.currentAccount!.id, enabled);
      return reply.send(updated);
    },
  );

  // DELETE /v1/scheduled-messages/:id
  fastify.delete(
    '/v1/scheduled-messages/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new ScheduledMessageService(fastify.db);
      await service.delete(id, request.currentAccount!.id);
      return reply.status(204).send();
    },
  );

  // POST /v1/scheduled-messages/fire — manually fire due messages (for cron worker)
  fastify.post(
    '/v1/scheduled-messages/fire',
    { preHandler },
    async (request, reply) => {
      const service = new ScheduledMessageService(fastify.db);
      const fired = await service.fireDueMessages();
      return reply.send({ fired: fired.length, ids: fired });
    },
  );
}
