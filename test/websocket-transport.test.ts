import assert from 'node:assert/strict';
import test from 'node:test';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import getPort from 'get-port';
import { WebSocketServer } from 'ws';

test('WebSocketClientTransport: connects successfully', async () => {
  const port = await getPort();
  const wss = new WebSocketServer({ port });

  const transport = new WebSocketClientTransport(new URL(`ws://localhost:${port}`));
  await transport.start();

  assert.ok(transport, 'Transport should be created');

  await transport.close();
  await new Promise<void>((r) => wss.close(() => r()));
});

test('WebSocketClientTransport: sends and receives messages', async () => {
  const port = await getPort();
  const wss = new WebSocketServer({ port });
  const receivedMessages: any[] = [];

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

  const responses: any[] = [];
  transport.onmessage = (msg) => {
    responses.push(msg);
  };

  await transport.start();

  // Send a message
  await transport.send({
    jsonrpc: '2.0',
    id: 1,
    method: 'test/method',
    params: { foo: 'bar' },
  } as any);

  // Wait for response
  await new Promise((r) => setTimeout(r, 100));

  assert.equal(receivedMessages.length, 1);
  assert.equal(receivedMessages[0].method, 'test/method');
  assert.equal(responses.length, 1);
  assert.equal(responses[0].result.echo, 'test/method');

  await transport.close();
  await new Promise<void>((r) => wss.close(() => r()));
});

test('WebSocketClientTransport: handles connection errors', async () => {
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

test('WebSocketClientTransport: calls onclose callback', async () => {
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

test('WebSocketClientTransport: rejects send when not connected', async () => {
  const transport = new WebSocketClientTransport(new URL('ws://localhost:9999'));

  try {
    await transport.send({ jsonrpc: '2.0', method: 'test' } as any);
    assert.fail('Should have thrown error');
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok((err as Error).message.includes('Not connected'));
  }
});
