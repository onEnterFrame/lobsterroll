import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as relations from './relations.js';

export function createDb(connectionString: string, options?: { prepare?: boolean }) {
  const client = postgres(connectionString, { prepare: options?.prepare ?? false });
  return drizzle(client, { schema: { ...schema, ...relations } });
}

export type Database = ReturnType<typeof createDb>;
