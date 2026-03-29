import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { workspaces } from '@lobster-roll/db';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { toFile } from 'openai';

export default async function transcriptionRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext, requirePermission('file:upload')];

  fastify.post(
    '/v1/transcriptions',
    { preHandler },
    async (request, reply) => {
      // Resolve OpenAI API key: workspace settings take precedence over env var
      const [workspace] = await fastify.db
        .select({ settings: workspaces.settings })
        .from(workspaces)
        .where(eq(workspaces.id, request.workspaceId!))
        .limit(1);

      const settings = (workspace?.settings ?? {}) as Record<string, unknown>;
      const whisperEnabled = settings.whisperEnabled === true;
      const openaiApiKey = (settings.openaiApiKey as string | null) || process.env.OPENAI_API_KEY;

      if (!openaiApiKey || !whisperEnabled) {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'Whisper transcription is not enabled for this workspace. Enable it in Settings.',
          403,
        );
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();

      const openai = new OpenAI({ apiKey: openaiApiKey });

      const audioFile = await toFile(
        Readable.from(buffer),
        data.filename || 'audio.webm',
        { type: data.mimetype || 'audio/webm' },
      );

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });

      return reply.status(200).send({ text: transcription.text });
    },
  );
}
