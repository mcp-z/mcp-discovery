import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import type { JSONRPCMessage, JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import assert from 'assert';
import getPort from 'get-port';
import { WebSocketServer } from 'ws';

it('WebSocketClientTransport: connects successfully', async () => {
  const port = await getPort();
  const wss = new WebSocketServer({ port });

  const transport = new WebSocketClientTransport(new URL(`ws://localhost:${port}`));
  await transport.start();

  assert.ok(transport, 'Transport should be created');

  await transport.close();
  await new Promise<void>((r) => wss.close(() => r()));
});

it('WebSocketClientTransport: sends and receives messages', async () => {
  const port = await getPort();
  const wss = new WebSocketServer({ port });
  const receivedMessages: JSONRPCMessage[] = [];

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      receivedMessages.push(msg);

      // Echo back
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: { echo: msg.method },
        })
      );
    });
  });

  const transport = new WebSocketClientTransport(new URL(`ws://localhost:${port}`));

  const responses: JSONRPCMessage[] = [];
  transport.onmessage = (msg) => {
    responses.push(msg);
  };

  await transport.start();

  // Send a properly typed JSON-RPC request
  const testRequest: JSONRPCRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'test/method',
    params: { foo: 'bar' },
  };
  await transport.send(testRequest);

  // Wait for response
  await new Promise((r) => setTimeout(r, 100));

  assert.equal(receivedMessages.length, 1);
  // receivedMessages contains the request we sent
  const receivedRequest = receivedMessages[0] as JSONRPCRequest;
  assert.equal(receivedRequest.method, 'test/method');

  assert.equal(responses.length, 1);
  // responses contains the response from the server
  const response = responses[0] as { jsonrpc: '2.0'; id: number; result: { echo: string } };
  assert.equal(response.result.echo, 'test/method');

  await transport.close();
  await new Promise<void>((r) => wss.close(() => r()));
});

it('WebSocketClientTransport: handles connection errors', async () => {
  const transport = new WebSocketClientTransport(new URL('ws://localhost:9999'));

  let errorReceived = false;
  transport.onerror = (_error) => {
    errorReceived = true;
  };

  try {
    await transport.start();
    assert.fail('Should have thrown error');
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok(errorReceived || err.message.includes('ECONNREFUSED'));
  }
});

it('WebSocketClientTransport: calls onclose callback', async () => {
  const port = await getPort();
  const wss = new WebSocketServer({ port });

  const transport = new WebSocketClientTransport(new URL(`ws://localhost:${port}`));

  let closeCalled = false;
  transport.onclose = () => {
    closeCalled = true;
  };

  await transport.start();
  await transport.close();

  await new Promise((r) => setTimeout(r, 50));
  assert.ok(closeCalled, 'onclose should be called');

  await new Promise<void>((r) => wss.close(() => r()));
});

it('WebSocketClientTransport: rejects send when not connected', async () => {
  const transport = new WebSocketClientTransport(new URL('ws://localhost:9999'));

  try {
    // Properly typed JSON-RPC notification (no id = notification)
    const testNotification: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'test',
    };
    await transport.send(testNotification);
    assert.fail('Should have thrown error');
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok((err as Error).message.includes('Not connected'));
  }
});
