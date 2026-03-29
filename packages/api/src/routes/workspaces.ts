import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { workspaces } from '@lobster-roll/db';
import { createWorkspaceSchema, AppError, ErrorCodes } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { generateProvisionToken } from '../utils/provision-token.js';

/** Mask the OpenAI API key in workspace settings before sending to clients. */
function maskWorkspaceSettings(settings: Record<string, unknown>): Record<string, unknown> {
  if (!settings.openaiApiKey) return settings;
  return {
    ...settings,
    openaiApiKey: '••••••••',
    openaiApiKeySet: true,
  };
}

export default async function workspaceRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/v1/workspaces',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = createWorkspaceSchema.parse(request.body);
      const service = new WorkspaceService(fastify.db);
      const workspace = await service.create(body, request.currentAccount!.id);
      return reply.status(201).send(workspace);
    },
  );

  fastify.get(
    '/v1/workspaces/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new WorkspaceService(fastify.db);
      const workspace = await service.getById(id);
      return reply.send({
        ...workspace,
        settings: maskWorkspaceSettings(workspace.settings as Record<string, unknown>),
      });
    },
  );

  /**
   * PATCH /v1/workspaces/:id/settings — Admin-only.
   * Stores integration settings (e.g. Whisper API key) in workspace.settings JSONB.
   * Only accepts known keys to prevent arbitrary data injection.
   */
  fastify.patch(
    '/v1/workspaces/:id/settings',
    { preHandler: [requireAuth, workspaceContext, requirePermission('workspace:admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (id !== request.workspaceId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot modify another workspace', 403);
      }

      const body = request.body as Record<string, unknown>;

      // Fetch current settings and merge
      const [current] = await fastify.db
        .select({ settings: workspaces.settings })
        .from(workspaces)
        .where(eq(workspaces.id, id))
        .limit(1);

      if (!current) {
        throw new AppError(ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found', 404);
      }

      const currentSettings = (current.settings ?? {}) as Record<string, unknown>;

      // Only allow known settings keys
      const allowedKeys = ['openaiApiKey', 'whisperEnabled'];
      const patch: Record<string, unknown> = {};
      for (const key of allowedKeys) {
        if (key in body) {
          // Allow clearing the key by sending null or empty string
          if (key === 'openaiApiKey' && (body[key] === null || body[key] === '')) {
            patch[key] = null;
          } else {
            patch[key] = body[key];
          }
        }
      }

      const newSettings = { ...currentSettings, ...patch };

      const [updated] = await fastify.db
        .update(workspaces)
        .set({ settings: newSettings, updatedAt: new Date() })
        .where(eq(workspaces.id, id))
        .returning();

      if (!updated) {
        throw new AppError(ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found', 404);
      }

      return reply.send({
        settings: maskWorkspaceSettings(newSettings),
      });
    },
  );

  /**
   * POST /v1/workspaces/:id/rotate-provision-token — Admin-only, rotates the agent provision token.
   */
  fastify.post(
    '/v1/workspaces/:id/rotate-provision-token',
    { preHandler: [requireAuth, workspaceContext, requirePermission('workspace:admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verify the workspace matches the current account's workspace
      if (id !== request.workspaceId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot modify another workspace', 403);
      }

      const newToken = generateProvisionToken();

      const [updated] = await fastify.db
        .update(workspaces)
        .set({ agentProvisionToken: newToken, updatedAt: new Date() })
        .where(eq(workspaces.id, id))
        .returning();

      if (!updated) {
        throw new AppError(ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found', 404);
      }

      return reply.send({ agentProvisionToken: newToken });
    },
  );
}
