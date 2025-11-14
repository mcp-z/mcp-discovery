import assert from 'assert';
import getPort from 'get-port';
import http from 'http';
import { advertiseService } from '../src/advertise.ts';
import { discoverServices } from '../src/discover.ts';

const cluster = 'c-version-test';
const serviceName = 'multi-version';

it('discover multiple versions and select highest', async () => {
  const servers: http.Server[] = [];
  const stops: (() => void)[] = [];

  // Get dynamic ports for 3 servers
  const [port1, port2, port3] = await Promise.all([getPort(), getPort(), getPort()]);

  // Create 3 servers with different versions
  const configs = [
    { port: port1, version: '1.0.0', node: 'http:v1' },
    { port: port2, version: '1.2.0', node: 'http:v2' },
    { port: port3, version: '0.9.0', node: 'http:v3' },
  ];

  for (const cfg of configs) {
    const server = http
      .createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      })
      .listen(cfg.port);
    servers.push(server);

    const { ready, cleanup } = advertiseService({
      cluster,
      serviceName,
      transport: 'http',
      port: cfg.port,
      path: '/mcp',
      version: cfg.version,
      auth: 'psk',
      node: cfg.node,
    });
    await ready; // Wait for advertisement to be published
    stops.push(cleanup);
  }

  const results = await discoverServices({ cluster, serviceName, timeoutMs: 1200 });
  assert.ok(results.length >= 3, 'Should discover at least 3 services');

  // User filters and selects highest version
  const best = results.sort((a, b) => (b.version || '0').localeCompare(a.version || '0', undefined, { numeric: true }))[0];

  assert.ok(best, 'Should find a service');
  assert.equal(best.version, '1.2.0', 'Should pick highest version');
  assert.equal(best.port, port2, 'Should pick port of v1.2.0 service');

  for (const s of stops) s();
  for (const s of servers) s.close();
});

it('discover multiple versions and select lowest', async () => {
  const servers: http.Server[] = [];
  const stops: (() => void)[] = [];

  // Get dynamic ports for 3 servers
  const [port1, port2, port3] = await Promise.all([getPort(), getPort(), getPort()]);

  const configs = [
    { port: port1, version: '2.0.0', node: 'http:v1' },
    { port: port2, version: '1.5.0', node: 'http:v2' },
    { port: port3, version: '1.0.0', node: 'http:v3' },
  ];

  for (const cfg of configs) {
    const server = http
      .createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      })
      .listen(cfg.port);
    servers.push(server);

    const { ready, cleanup } = advertiseService({
      cluster: 'c-lowest-test',
      serviceName: 'lowest-test',
      transport: 'http',
      port: cfg.port,
      path: '/mcp',
      version: cfg.version,
      auth: 'psk',
      node: cfg.node,
    });
    await ready; // Wait for advertisement to be published
    stops.push(cleanup);
  }

  const results = await discoverServices({ cluster: 'c-lowest-test', serviceName: 'lowest-test', timeoutMs: 1200 });

  // Select lowest version
  const lowest = results.sort((a, b) => (a.version || '0').localeCompare(b.version || '0', undefined, { numeric: true }))[0];

  assert.ok(lowest, 'Should find at least one service');
  assert.equal(lowest.version, '1.0.0', 'Should pick lowest version');
  assert.equal(lowest.port, port3);

  for (const s of stops) s();
  for (const s of servers) s.close();
});

it('filter versions by range (v1.x only)', async () => {
  const servers: http.Server[] = [];
  const stops: (() => void)[] = [];

  // Get dynamic ports for 3 servers
  const [port1, port2, port3] = await Promise.all([getPort(), getPort(), getPort()]);

  const configs = [
    { port: port1, version: '1.0.0', node: 'http:v1.0' },
    { port: port2, version: '1.5.0', node: 'http:v1.5' },
    { port: port3, version: '2.0.0', node: 'http:v2.0' },
  ];

  for (const cfg of configs) {
    const server = http
      .createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      })
      .listen(cfg.port);
    servers.push(server);

    const { ready, cleanup } = advertiseService({
      cluster: 'c-range-test',
      serviceName: 'range-test',
      transport: 'http',
      port: cfg.port,
      path: '/mcp',
      version: cfg.version,
      auth: 'psk',
      node: cfg.node,
    });
    await ready; // Wait for advertisement to be published
    stops.push(cleanup);
  }

  const results = await discoverServices({ cluster: 'c-range-test', serviceName: 'range-test', timeoutMs: 1200 });

  // Filter to v1.x only
  const v1Services = results.filter((s) => s.version && s.version.startsWith('1.'));

  assert.equal(v1Services.length, 2, 'Should find 2 v1.x services');
  assert.ok(
    v1Services.every((s) => s.version?.startsWith('1.')),
    'All should be v1.x'
  );

  for (const s of stops) s();
  for (const s of servers) s.close();
});

it('discover returns empty array when no services found', async () => {
  const results = await discoverServices({
    cluster: 'nonexistent',
    serviceName: 'nonexistent',
    timeoutMs: 500,
  });
  assert.equal(results.length, 0);
});
