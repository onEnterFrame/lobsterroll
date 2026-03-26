import { randomBytes, createHash } from 'node:crypto';
import { API_KEY_LENGTH } from '@lobster-roll/shared';

export function generateApiKey(): { raw: string; hashed: string } {
  const raw = `lr_${randomBytes(API_KEY_LENGTH).toString('hex')}`;
  const hashed = hashApiKey(raw);
  return { raw, hashed };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
