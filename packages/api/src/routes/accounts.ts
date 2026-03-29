import type { FastifyInstance } from 'fastify';
import { guardAccountCreation } from '../middleware/abuse-guards.js';
import {
  createAccountSchema,
  batchCreateAccountsSchema,
  updateAccountSchema,
  AppError,
  ErrorCodes,
} from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { AccountService } from '../services/account.service.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { FileStorageService } from '../services/file-storage.js';

export default async function accountRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  fastify.post(
    '/v1/accounts',
    { preHandler: [...preHandler, guardAccountCreation] },
    async (request, reply) => {
      const body = createAccountSchema.parse(request.body);
      const workspaceService = new WorkspaceService(fastify.db);
      const workspace = await workspaceService.getById(request.workspaceId!);
      const service = new AccountService(fastify.db);
      const result = await service.create(
        body,
        request.workspaceId!,
        request.currentAccount!.id,
        workspace.provisioningMode,
      );

      if (result.pending) {
        return reply.status(202).send({
          message: 'Account creation requires approval',
          approval: result.approval,
        });
      }

      return reply.status(201).send({
        account: result.account,
        apiKey: result.apiKey,
      });
    },
  );

  fastify.post(
    '/v1/accounts/batch',
    { preHandler: [...preHandler, requirePermission('workspace:manage_agents')] },
    async (request, reply) => {
      const body = batchCreateAccountsSchema.parse(request.body);
      const workspaceService = new WorkspaceService(fastify.db);
      const workspace = await workspaceService.getById(request.workspaceId!);
      const service = new AccountService(fastify.db);
      const results = await service.batchCreate(
        body.accounts,
        request.workspaceId!,
        request.currentAccount!.id,
        workspace.provisioningMode,
      );
      return reply.status(201).send({ results });
    },
  );

  fastify.get(
    '/v1/accounts/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new AccountService(fastify.db);
      const account = await service.getById(id, request.workspaceId!);
      return reply.send(account);
    },
  );

  fastify.patch(
    '/v1/accounts/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateAccountSchema.parse(request.body);
      const service = new AccountService(fastify.db);
      const account = await service.update(id, body, request.workspaceId!);
      return reply.send(account);
    },
  );

  fastify.delete(
    '/v1/accounts/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new AccountService(fastify.db);
      const account = await service.deactivate(id, request.workspaceId!);
      return reply.send(account);
    },
  );

  fastify.get(
    '/v1/roster',
    { preHandler },
    async (request, reply) => {
      const service = new AccountService(fastify.db);
      const roster = await service.getRoster(request.workspaceId!);
      return reply.send(roster);
    },
  );

  // ─── Avatar upload ──────────────────────────────────────────────

  fastify.post(
    '/v1/accounts/:id/avatar',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (request.currentAccount!.id !== id) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'You can only update your own avatar', 403);
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();
      const storage = new FileStorageService(fastify.config);
      const result = await storage.upload(buffer, data.filename, data.mimetype);

      const service = new AccountService(fastify.db);
      const account = await service.update(id, { avatarUrl: result.url }, request.workspaceId!);

      return reply.send({ avatarUrl: account.avatarUrl });
    },
  );

  fastify.delete(
    '/v1/accounts/:id/avatar',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (request.currentAccount!.id !== id) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'You can only update your own avatar', 403);
      }

      const service = new AccountService(fastify.db);
      const account = await service.update(id, { avatarUrl: null }, request.workspaceId!);

      return reply.send({ avatarUrl: account.avatarUrl });
    },
  );
}
