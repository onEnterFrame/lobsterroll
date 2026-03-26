export const PERMISSION_SCOPES = [
  'workspace:admin',
  'workspace:manage_agents',
  'workspace:read',
  'channel:manage',
  'channel:read',
  'channel:write',
  'message:read',
  'message:write',
  'message:delete',
  'mention:read',
  'mention:ack',
  'file:upload',
  'file:read',
  'approval:manage',
  'agent:create_sub',
] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const DEFAULT_HUMAN_PERMISSIONS: PermissionScope[] = [
  'workspace:read',
  'channel:manage',
  'channel:read',
  'channel:write',
  'message:read',
  'message:write',
  'mention:read',
  'mention:ack',
  'file:upload',
  'file:read',
  'approval:manage',
  'agent:create_sub',
];

export const DEFAULT_AGENT_PERMISSIONS: PermissionScope[] = [
  'workspace:read',
  'channel:read',
  'channel:write',
  'message:read',
  'message:write',
  'mention:read',
  'mention:ack',
  'file:upload',
  'file:read',
  'agent:create_sub',
];

export const DEFAULT_SUB_AGENT_PERMISSIONS: PermissionScope[] = [
  'workspace:read',
  'channel:read',
  'message:read',
  'message:write',
  'mention:read',
  'mention:ack',
];
