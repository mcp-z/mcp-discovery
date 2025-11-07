
# @mcpeasy/mcp-discovery

[![npm](https://img.shields.io/npm/v/@mcpeasy/mcp-discovery.svg)](https://www.npmjs.com/package/@mcpeasy/mcp-discovery)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/node/v/@mcpeasy/mcp-discovery.svg)](https://nodejs.org)
[![npm downloads](https://img.shields.io/npm/dm/@mcpeasy/mcp-discovery.svg)](https://www.npmjs.com/package/@mcpeasy/mcp-discovery)

**Zero-configuration service discovery for MCP servers via mDNS. Supports HTTP and WebSocket transports.**

---

## Why This Exists

When running a cluster of MCP servers, you often need both public and private interfaces:

- **Public interface** (`/mcp`) - External access, secured via OAuth/authentication
- **Private interface** (`/internal/mcp`) - Internal cluster communication, discovered via mDNS

This library enables zero-configuration discovery of private MCP endpoints within your local network, optionally secured with PSK (pre-shared key) authentication.

**Use Cases:**
- MCP server clusters that need to discover each other
- Internal service mesh communication
- Development/staging environments
- Local network deployments where manual configuration is impractical

⚠️ **Security Notice:** This library is designed for **trusted local networks** (same LAN/VLAN). Do not expose discovery or PSK-authenticated endpoints to untrusted networks. If you're unsure about securing your MCP servers or what's appropriate for your situation, **consult a security expert**.

---

## Features

- 🔍 **Service Discovery** - Find MCP servers on your local network via mDNS/DNS-SD
- 📢 **Service Advertisement** - Broadcast your MCP server's availability
- 🌐 **HTTP & WebSocket** - Support for both transport types
- 🔒 **Optional PSK Authentication** - Pre-shared key helpers for secure communication
- 📦 **Version Selection** - Filter services by version compatibility
- 🔌 **MCP SDK Integration** - Works seamlessly with official `@modelcontextprotocol/sdk`
- 📘 **TypeScript** - Full type definitions included
- 🎯 **Zero Configuration** - Works out-of-the-box on macOS, Linux (Avahi), Windows (Bonjour)

---

## Install

```bash
# npm
npm install @mcpeasy/mcp-discovery

# yarn
yarn add @mcpeasy/mcp-discovery

# pnpm
pnpm add @mcpeasy/mcp-discovery
```

---

## Quick Start

### Server: Advertise Your Service

```typescript
import { advertiseService } from '@mcpeasy/mcp-discovery';

const stopAdvertising = advertiseService({
  cluster: 'my-cluster',
  serviceName: 'gmail',
  transport: 'http',  // or 'ws'
  port: 8080,
  path: '/internal/mcp',  // Use /internal/mcp for private cluster communication
  version: '1.0.0',
  node: 'http:prod',  // Unique identifier for this server instance
  auth: 'psk'
});

// Stop advertising when shutting down
process.on('SIGINT', () => {
  stopAdvertising();
  process.exit(0);
});
```

### Client: Discover and Connect

```typescript
import { discoverServices, toBaseUrl } from '@mcpeasy/mcp-discovery';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// 1. Discover services
const services = await discoverServices({
  cluster: 'my-cluster',
  serviceName: 'gmail',
  timeoutMs: 1500
});

// 2. Select service (e.g., highest version)
const service = services
  .sort((a, b) => (b.version || '0').localeCompare(a.version || '0', undefined, { numeric: true }))
  [0];

// 3. Connect with MCP SDK
const url = toBaseUrl(service);
const transport = new StreamableHTTPClientTransport(new URL(url));
const client = new Client({ name: 'my-app', version: '1.0.0' }, { capabilities: {} });

await client.connect(transport);

// 4. Use the client
const tools = await client.listTools();
console.log('Available tools:', tools);
```

---

## Quick Win (30 seconds)

Want to see mDNS discovery working immediately?

```bash
# Clone and install
git clone https://github.com/mcp-z/mcp-discovery.git
cd mcp-discovery
npm install

# Run the integration test - watch discovery happen in real-time!
npm test
```

✅ You'll see services being advertised and discovered via mDNS!

---

## API Reference

### `advertiseService(opts)`

Broadcast your MCP service on the local network.

**Options:**
- `cluster` (string) - Cluster name (e.g., 'production', 'dev')
- `serviceName` (string) - Service identifier (e.g., 'gmail', 'sheets')
- `transport` ('http' | 'ws') - Transport protocol
- `port` (number) - Port number
- `path` (string, optional) - URL path (default: '/mcp')
- `version` (string, optional) - Service version (default: '1.0.0')
- `node` (string) - Unique node identifier (e.g., 'http:prod-01')
- `auth` ('psk' | 'mtls', optional) - Authentication type (default: 'psk')

**Returns:** Function to stop advertising

### `discoverServices(opts)`

Find MCP services on the local network.

**Options:**
- `cluster` (string) - Cluster to search in
- `serviceName` (string) - Service to find
- `timeoutMs` (number, optional) - Discovery timeout (default: 1500ms)

**Returns:** `Promise<ServiceInfo[]>`

**ServiceInfo:**
```typescript
{
  cluster: string;
  serviceName: string;
  transport: 'http' | 'ws';
  host: string;
  port: number;
  path: string;
  version?: string;
  node: string;
  auth: 'psk' | 'mtls';
}
```

### `toBaseUrl(service)`

Convert a discovered service to a connection URL.

```typescript
const url = toBaseUrl(service);
// 'http://hostname.local:8080/mcp' or 'ws://hostname.local:8080/mcp'
```

---

## Transport Support

### HTTP

Use with official SDK's `StreamableHTTPClientTransport`:

```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL(toBaseUrl(service)));
```

### WebSocket

**Client:** Use SDK's `WebSocketClientTransport` (SDK 1.18+)

```typescript
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';

const transport = new WebSocketClientTransport(new URL(toBaseUrl(service)));
```

**Server:** Use included `WebSocketServerTransport`

```typescript
import { WebSocketServerTransport } from '@mcpeasy/mcp-discovery/transports/websocket-server.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', async (ws) => {
  const transport = new WebSocketServerTransport(ws);
  const server = new Server({ name: 'my-server', version: '1.0.0' }, { capabilities: {} });
  await server.connect(transport);
});
```

---

## Service Selection

### Filter by Transport

```typescript
const httpServices = services.filter(s => s.transport === 'http');
const wsServices = services.filter(s => s.transport === 'ws');
```

### Select by Version

```typescript
// Highest version
const latest = services
  .sort((a, b) => (b.version || '0').localeCompare(a.version || '0', undefined, { numeric: true }))
  [0];

// Semantic version range (using semver package)
import semver from 'semver';
const compatible = services.filter(s => s.version && semver.satisfies(s.version, '^1.0.0'));
```

### Multiple Criteria

```typescript
const best = services
  .filter(s => s.transport === 'ws')
  .filter(s => s.version?.startsWith('2.'))
  .sort((a, b) => (b.version || '0').localeCompare(a.version || '0', undefined, { numeric: true }))
  [0];
```

---

## Authentication

### PSK (Pre-Shared Key)

Optional HMAC-based authentication helpers for inter-server communication on trusted networks.

⚠️ **Security Warning:** PSK authentication is suitable for internal cluster communication on trusted local networks. It is **NOT** a replacement for proper authentication (OAuth, mTLS) on public endpoints. Use at your own risk. If unsure, consult a security expert.

**Recommended Pattern:**
- **Public endpoint** (`/mcp`) - Use OAuth, API keys, or other robust authentication
- **Internal endpoint** (`/internal/mcp`) - Use PSK + discovery for cluster communication

**Build auth header (client):**
```typescript
import { buildAuthHeader } from '@mcpeasy/mcp-discovery';

const authHeader = buildAuthHeader(secret, 'POST', '/mcp', requestBody);
```

**Verify auth (server):**
```typescript
import { verifyPskHmac, expressPskHmac } from '@mcpeasy/mcp-discovery';

// Express middleware
app.use(expressPskHmac(secret));

// Manual verification
const valid = verifyPskHmac({ secret, method, path, body, authHeader });
```

See [`test/psk-auth.test.ts`](./test/psk-auth.test.ts) and [`src/psk.ts`](./src/psk.ts) for complete examples.

---

## Understanding serviceName, node, and version

- **`serviceName`** - What the service does (e.g., 'gmail'). Same across all instances.
- **`node`** - Which server instance (e.g., 'http:prod-01'). Must be unique per instance.
- **`version`** - Which API version (e.g., '2.0.0'). Used for client filtering.

**Why all three?** `serviceName` + `node` form the unique mDNS name. `version` is metadata for compatibility filtering.

**Example:** Running two servers of the same service:
```typescript
// Server 1
advertiseService({ serviceName: 'gmail', node: 'http:prod-01', version: '2.0.0', port: 8080 });

// Server 2 (load balancing)
advertiseService({ serviceName: 'gmail', node: 'http:prod-02', version: '2.0.0', port: 8081 });
```

Clients discover both and can select either.

---

## Examples & Tests

### Complete Working Examples

See the `test/` directory for comprehensive examples:

**Version Selection:**
- [`test/version-selection.test.ts`](./test/version-selection.test.ts) - Filter by version, select highest version, compatibility ranges
- Perfect for: Multi-version deployments

**WebSocket Integration:**
- [`test/websocket-integration.test.ts`](./test/websocket-integration.test.ts) - Complete WebSocket server + client + MCP communication
- Production-ready: Full lifecycle management

**PSK Authentication:**
- [`test/psk-auth.test.ts`](./test/psk-auth.test.ts) - Pre-shared key authentication patterns
- Secure: HMAC-based request signing

**Run all tests:**
```bash
npm test  # 17 tests, all passing
```

**Run specific test:**
```bash
npm test -- test/websocket-integration.test.ts
```

---

## How It Works

This library uses mDNS (Multicast DNS) / Bonjour for zero-configuration service discovery on local networks.

**Platform Support:**
- **macOS:** Built-in Bonjour support
- **Linux:** Requires Avahi daemon (`apt install avahi-daemon`)
- **Windows:** Requires Bonjour for Windows

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP documentation
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK
- [Report Issues](https://github.com/mcp-z/mcp-discovery/issues) - Bug reports and feature requests

---

## License

MIT © [Kevin Malakoff](https://github.com/kmalakoff)
