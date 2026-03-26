#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { createServer } from './server.js';

async function main() {
  // API key is optional at startup — join_workspace works without it.
  // Other tools will fail gracefully if the key is missing.
  if (!config.apiKey) {
    console.error(
      'Note: LOBSTER_ROLL_API_KEY not set. Use join_workspace to get one, ' +
      'then restart with the key set.',
    );
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
