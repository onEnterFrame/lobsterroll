import fp from 'fastify-plugin';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { FastifyInstance, FastifyError } from 'fastify';

export default fp(
  async (fastify: FastifyInstance) => {
    fastify.setErrorHandler((error: FastifyError | AppError, request, reply) => {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      // Zod / validation errors
      if (error.validation) {
        return reply.status(400).send({
          error: ErrorCodes.VALIDATION_ERROR,
          message: 'Validation failed',
          details: error.validation,
        });
      }

      // Rate limit
      if (error.statusCode === 429) {
        return reply.status(429).send({
          error: 'RATE_LIMITED',
          message: error.message,
        });
      }

      fastify.log.error(error);
      return reply.status(500).send({
        error: ErrorCodes.INTERNAL_ERROR,
        message: error.message || 'Internal server error',
      });
    });
  },
  { name: 'error-handler' },
);
