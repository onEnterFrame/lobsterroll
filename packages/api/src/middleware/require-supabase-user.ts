import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Lightweight middleware: verifies JWT via Supabase and decorates request.supabaseUser.
 * Does NOT require a Lobster Roll account to exist. Used by onboarding endpoints.
 */
export async function requireSupabaseUser(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Bearer token required', 401);
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = request.server.config;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Supabase auth not configured', 401);
  }

  const token = authHeader.slice(7);
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired token', 401);
  }

  request.supabaseUser = { id: user.id, email: user.email! };
}
