import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin']).default('member'),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
