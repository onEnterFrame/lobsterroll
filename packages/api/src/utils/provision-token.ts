import { randomBytes } from 'node:crypto';

export function generateProvisionToken(): string {
  return `lr_prov_${randomBytes(16).toString('hex')}`;
}
