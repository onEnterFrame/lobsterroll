import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { requirePermission } from '../middleware/require-permission.js';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { toFile } from 'openai';

export default async function transcriptionRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext, requirePermission('file:upload')];

  fastify.post(
    '/v1/transcriptions',
    { preHandler },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

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
