import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { FileStorageService } from '../services/file-storage.js';

export default async function fileRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext, requirePermission('file:upload')];

  fastify.post(
    '/v1/files/upload',
    { preHandler },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();
      const storage = new FileStorageService(fastify.config);
      const result = await storage.upload(buffer, data.filename, data.mimetype);

      return reply.status(201).send(result);
    },
  );
}
