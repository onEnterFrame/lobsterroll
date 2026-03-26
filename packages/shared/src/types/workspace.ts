export const PROVISIONING_MODES = ['open', 'supervised', 'locked'] as const;
export type ProvisioningMode = (typeof PROVISIONING_MODES)[number];

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  provisioningMode: ProvisioningMode;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
