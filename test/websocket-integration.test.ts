import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer } from 'ws';
import { advertiseService } from '../src/advertise.ts';
import { discoverServices, toBaseUrl } from '../src/discover.ts';
import { WebSocketServerTransport } from '../src/transports/websocket-server.ts';

const cluster = 'c-ws-test';
const serviceName = 'ws-service';
const port = 9700;

test('WebSocket: complete flow with MCP SDK server transport', { timeout: 5000 }, async () => {
  // Step 1: Create WebSocket server with MCP SDK
  const wss = new WebSocketServer({ port });
  const servers: Server[] = [];

  wss.on('connection', async (ws) => {
    const transport = new WebSocketServerTransport(ws);
    const server = new Server(
      {
        name: serviceName,
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register echo tool
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'echo',
          description: 'Echoes back the input',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
            required: ['message'],
          },
        },
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      if (name === 'echo') {
        if (!args || typeof args !== 'object' || !('message' in args)) {
          throw new Error('Invalid arguments for echo tool');
        }
        return {
          content: [
            {
              type: 'text',
              text: `Echo: ${(args as { message: string }).message}`,
            },
          ],
        };
      }
      throw new Error('Unknown tool');
    });

    await server.connect(transport);
    servers.push(server);
  });

  // Step 2: Advertise via mDNS
  const stopAdvertising = advertiseService({
    cluster,
    serviceName,
    transport: 'ws',
    port,
    path: '/mcp',
    version: '1.0.0',
    auth: 'psk',
    node: 'ws:test',
  });

  // Step 3: Wait for mDNS propagation
  await new Promise((r) => setTimeout(r, 500));

  // Step 4: Discover services
  const services = await discoverServices({ cluster, serviceName, timeoutMs: 1500 });

  assert.ok(services.length > 0, 'Should discover at least one service');
  const firstService = services[0];
  assert.ok(firstService, 'First service should exist');
  assert.equal(firstService.serviceName, serviceName);
  assert.equal(firstService.transport, 'ws');
  assert.equal(firstService.version, '1.0.0');

  // Step 5: Filter to WebSocket services
  const wsServices = services.filter((s) => s.transport === 'ws');
  assert.ok(wsServices.length > 0, 'Should find WebSocket service');

  const best = wsServices.sort((a, b) => (b.version || '0.0.0').localeCompare(a.version || '0.0.0', undefined, { numeric: true }))[0];
  assert.ok(best, 'Should find best WebSocket service');

  // Step 6: Create client with OUR WebSocket transport
  const url = toBaseUrl(best);
  const clientTransport = new WebSocketClientTransport(new URL(url));

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(clientTransport);

  // Step 7: List tools
  const toolsResult = await client.listTools();
  assert.ok(toolsResult.tools.length === 1, 'Should have 1 tool');
  const firstTool = toolsResult.tools[0];
  assert.ok(firstTool, 'First tool should exist');
  assert.equal(firstTool.name, 'echo');

  // Step 8: Call echo tool
  const echoResult = await client.callTool({
    name: 'echo',
    arguments: { message: 'Hello from WebSocket!' },
  });
  assert.ok(Array.isArray(echoResult.content) && echoResult.content.length > 0, 'Should have content');
  const firstContent = echoResult.content[0];
  assert.ok(firstContent && typeof firstContent === 'object' && 'type' in firstContent, 'Content should have type');
  assert.ok(firstContent.type === 'text');
  assert.ok('text' in firstContent && typeof firstContent.text === 'string' && firstContent.text.includes('Hello from WebSocket!'));

  // Cleanup
  await client.close();
  for (const server of servers) {
    await server.close();
  }
  stopAdvertising();
  await new Promise<void>((resolve) => {
    wss.close(() => resolve());
  });
});
