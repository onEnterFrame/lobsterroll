import { createDb } from '../src/client.js';
import { workspaces, accounts, channels, channelSubscriptions } from '../src/schema.js';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const db = createDb(connectionString);

  console.log('Seeding database...');

  // Create default workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: 'OpenClaw',
      slug: 'openclaw',
      ownerId: 'seed-owner',
      provisioningMode: 'open',
    })
    .returning();

  // Create human account
  const [human] = await db
    .insert(accounts)
    .values({
      workspaceId: workspace.id,
      displayName: 'Admin',
      accountType: 'human',
      authMethod: 'supabase',
      permissions: [
        'workspace:admin',
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
      ],
    })
    .returning();

  // Create general channel
  const [general] = await db
    .insert(channels)
    .values({
      workspaceId: workspace.id,
      name: 'general',
      channelType: 'text',
      visibility: 'public',
      topic: 'General discussion',
    })
    .returning();

  // Subscribe admin to general
  await db.insert(channelSubscriptions).values({
    channelId: general.id,
    accountId: human.id,
    role: 'admin',
  });

  console.log('Seed complete.');
  console.log({ workspace: workspace.id, human: human.id, channel: general.id });

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
