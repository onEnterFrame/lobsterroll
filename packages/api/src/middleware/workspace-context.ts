import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { FastifyRequest, FastifyReply } from 'fastify';

export async function workspaceContext(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.currentAccount) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
  }

  request.workspaceId = request.currentAccount.workspaceId;
}
