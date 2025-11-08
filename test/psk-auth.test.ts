import assert from 'assert';
import { buildAuthHeader, verifyPskHmac } from '../src/psk.ts';

const secret = 'test-secret-key';

it('buildAuthHeader creates valid HMAC header', () => {
  const header = buildAuthHeader(secret, 'POST', '/mcp', { method: 'tools/list' });
  assert.ok(header.startsWith('MCP-HMAC '));
  assert.ok(header.includes('id='));
  assert.ok(header.includes('ts='));
  assert.ok(header.includes('nonce='));
  assert.ok(header.includes('mac='));
});

it('verifyPskHmac validates correct auth header', () => {
  const method = 'POST';
  const path = '/mcp';
  const body = { method: 'tools/list' };
  const authHeader = buildAuthHeader(secret, method, path, body);

  const valid = verifyPskHmac({ secret, method, path, body, authHeader });
  assert.equal(valid, true, 'Should validate correct auth header');
});

it('verifyPskHmac rejects wrong secret', () => {
  const method = 'POST';
  const path = '/mcp';
  const body = { method: 'tools/list' };
  const authHeader = buildAuthHeader(secret, method, path, body);

  const valid = verifyPskHmac({ secret: 'wrong-secret', method, path, body, authHeader });
  assert.equal(valid, false, 'Should reject wrong secret');
});

it('verifyPskHmac rejects tampered body', () => {
  const method = 'POST';
  const path = '/mcp';
  const body = { method: 'tools/list' };
  const authHeader = buildAuthHeader(secret, method, path, body);

  const tamperedBody = { method: 'tools/call' };
  const valid = verifyPskHmac({ secret, method, path, body: tamperedBody, authHeader });
  assert.equal(valid, false, 'Should reject tampered body');
});

it('verifyPskHmac rejects invalid header format', () => {
  const valid = verifyPskHmac({
    secret,
    method: 'POST',
    path: '/mcp',
    authHeader: 'Bearer token123',
  });
  assert.equal(valid, false, 'Should reject non-HMAC header');
});

it('verifyPskHmac rejects missing header', () => {
  const valid = verifyPskHmac({
    secret,
    method: 'POST',
    path: '/mcp',
  });
  assert.equal(valid, false, 'Should reject missing header');
});

it('verifyPskHmac rejects expired timestamp', () => {
  // Create header with old timestamp
  const method = 'POST';
  const path = '/mcp';
  const oldTs = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
  const fakeHeader = `MCP-HMAC id=client, ts=${oldTs}, nonce=abc123, mac=invalid`;

  const valid = verifyPskHmac({ secret, method, path, authHeader: fakeHeader });
  assert.equal(valid, false, 'Should reject expired timestamp');
});
