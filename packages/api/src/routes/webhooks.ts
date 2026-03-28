import type { FastifyInstance } from 'fastify';
import { createWebhookSchema, webhookPayloadSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { WebhookService } from '../services/webhook.service.js';

export default async function webhookRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/webhooks — create a webhook for a channel
  fastify.post(
    '/v1/webhooks',
    { preHandler },
    async (request, reply) => {
      const body = createWebhookSchema.parse(request.body);
      const service = new WebhookService(fastify.db);
      const webhook = await service.create(body, request.currentAccount!.id);
      return reply.status(201).send(webhook);
    },
  );

  // GET /v1/webhooks?channelId=xxx — list webhooks for a channel
  fastify.get(
    '/v1/webhooks',
    { preHandler },
    async (request, reply) => {
      const { channelId } = request.query as { channelId: string };
      if (!channelId) {
        return reply.status(400).send({ error: 'channelId is required' });
      }
      const service = new WebhookService(fastify.db);
      const webhooks = await service.listForChannel(channelId);
      return reply.send(webhooks);
    },
  );

  // PUT /v1/webhooks/:id/toggle — enable/disable
  fastify.put(
    '/v1/webhooks/:id/toggle',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { enabled } = request.body as { enabled: boolean };
      const service = new WebhookService(fastify.db);
      const webhook = await service.toggle(id, enabled);
      return reply.send(webhook);
    },
  );

  // DELETE /v1/webhooks/:id
  fastify.delete(
    '/v1/webhooks/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new WebhookService(fastify.db);
      await service.delete(id);
      return reply.status(204).send();
    },
  );

  // ── PUBLIC inbound endpoint (no auth — uses webhook token) ────────

  // POST /v1/webhooks/ingest/:token — external services POST here
  fastify.post(
    '/v1/webhooks/ingest/:token',
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const body = webhookPayloadSchema.parse(request.body);
      const service = new WebhookService(fastify.db);
      const message = await service.ingest(token, body);
      return reply.status(201).send({ ok: true, messageId: message.id });
    },
  );
}
