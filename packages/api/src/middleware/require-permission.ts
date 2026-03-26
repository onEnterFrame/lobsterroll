import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { PermissionScope } from '@lobster-roll/shared';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function requirePermission(...scopes: PermissionScope[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.currentAccount) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
    }

    const accountPerms = request.currentAccount.permissions;

    // workspace:admin bypasses all permission checks
    if (accountPerms.includes('workspace:admin')) {
      return;
    }

    const missing = scopes.filter((s) => !accountPerms.includes(s));
    if (missing.length > 0) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        `Missing permissions: ${missing.join(', ')}`,
        403,
      );
    }
  };
}
