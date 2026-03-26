import { z } from 'zod';
import { ACCOUNT_TYPES, AUTH_METHODS, ACCOUNT_STATUSES } from '../types/account.js';
import { PERMISSION_SCOPES } from '../types/permissions.js';
import { CALLBACK_METHODS } from '../types/agent-callback.js';

export const createAccountSchema = z.object({
  displayName: z.string().min(1).max(100),
  accountType: z.enum(ACCOUNT_TYPES),
  parentId: z.string().uuid().nullable().default(null),
  authMethod: z.enum(AUTH_METHODS).default('api_key'),
  permissions: z.array(z.enum(PERMISSION_SCOPES)).optional(),
  metadata: z.record(z.unknown()).default({}),
  callback: z
    .object({
      method: z.enum(CALLBACK_METHODS),
      config: z.record(z.unknown()),
    })
    .optional(),
});

export const batchCreateAccountsSchema = z.object({
  accounts: z.array(createAccountSchema).min(1).max(50),
});

export const updateAccountSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  permissions: z.array(z.enum(PERMISSION_SCOPES)).optional(),
  metadata: z.record(z.unknown()).optional(),
  callback: z
    .object({
      method: z.enum(CALLBACK_METHODS),
      config: z.record(z.unknown()),
    })
    .optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type BatchCreateAccountsInput = z.infer<typeof batchCreateAccountsSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
