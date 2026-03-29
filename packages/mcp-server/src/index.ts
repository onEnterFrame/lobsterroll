#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { config } from './config.js';
import { createServer } from './server.js';

const PACKAGE_VERSION = '1.0.0';
const TOOL_COUNT = 24;

async function runStdio() {
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

async function runHttp() {
  const port = parseInt(process.env.PORT ?? '3333', 10);

  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const status = {
        name: 'lobster-roll-mcp',
        version: PACKAGE_VERSION,
        tools: TOOL_COUNT,
        transport: 'http',
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/mcp') {
      // Read body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;

      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(port, () => {
    console.error(`Lobster Roll MCP server listening on http://0.0.0.0:${port}/mcp`);
  });
}

async function main() {
  const transport = process.env.MCP_TRANSPORT;

  if (transport === 'http' || transport === 'streamable-http') {
    await runHttp();
  } else {
    await runStdio();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
