import type { PermissionScope } from './permissions.js';

export const ACCOUNT_TYPES = ['human', 'agent', 'sub_agent'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const AUTH_METHODS = ['supabase', 'api_key'] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const ACCOUNT_STATUSES = ['active', 'frozen', 'deactivated'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface Account {
  id: string;
  workspaceId: string;
  displayName: string;
  accountType: AccountType;
  parentId: string | null;
  ownerId: string | null;
  authMethod: AuthMethod;
  apiKeyHash: string | null;
  status: AccountStatus;
  permissions: PermissionScope[];
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  createdBy: string | null;
}
