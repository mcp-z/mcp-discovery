# Contributing to @mcpeasy/mcp-discovery

Thank you for your interest in contributing!

This project provides mDNS/DNS-SD service discovery for Model Context Protocol (MCP) servers, enabling automatic discovery of MCP services on local networks.

## Development Workflow

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/mcp-z/mcp-discovery.git
   cd mcp-discovery
   npm install
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Run type checking:
   ```bash
   npm run typecheck
   ```

4. Format & lint (Biome auto-fixes):
   ```bash
   npm run format
   ```

5. Lint only (no auto-fix):
   ```bash
   npm run lint
   ```

## Project Structure

- `src/` – Source code
  - `advertise.ts` – Service advertisement via mDNS
  - `discover.ts` – Service discovery
  - `psk.ts` – Optional PSK authentication helpers
  - `types.ts` – TypeScript type definitions
  - `transports/` – Transport implementations
    - `websocket-server.ts` – WebSocket server transport for MCP SDK
  - `index.ts` – Public exports
- `test/` – Test suites using Node's test runner
  - `psk-auth.test.ts` – PSK authentication tests
  - `version-selection.test.ts` – Version filtering tests
  - `websocket-integration.test.ts` – Full WebSocket integration test
  - `websocket-transport.test.ts` – WebSocket transport unit tests
- `dist/` – Generated build artifacts (dual ESM/CJS)

## Understanding the Architecture

This library has three main responsibilities:

1. **Service Advertisement** – Broadcast MCP service availability via mDNS using bonjour-service
2. **Service Discovery** – Find available MCP services on the local network
3. **Transport Integration** – Provide utilities to connect discovered services with MCP SDK

**What this library does NOT do:**
- Implement the MCP protocol (use `@modelcontextprotocol/sdk`)
- Provide full server/client implementations
- Handle business logic or tool implementations

## Coding Standards

- Strict TypeScript settings (noUncheckedIndexedAccess, exactOptionalPropertyTypes, etc.)
- Use Biome for formatting and linting (runs automatically in CI)
- Prefer small, reviewable commits with conventional prefixes
- All public APIs must be documented with JSDoc comments
- New features should include tests

## Commit Messages

Use Conventional Commit style:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `chore:` tooling or maintenance
- `test:` test-only updates
- `refactor:` code restructuring

Examples:
- `feat: add support for HTTPS transport`
- `fix: handle IPv6 addresses correctly`
- `docs: clarify PSK authentication usage`
- `test: add edge case for empty service list`

## Testing

- Use Node's built-in test runner (no Jest/Mocha to keep footprint small)
- Test real mDNS advertisement and discovery flows
- Verify integration with MCP SDK transports
- Test version selection and filtering logic
- All tests must pass before merging: `npm test`
- Multi-version compatibility (if applicable): `npm run test:engines`

### Writing Tests

- Place tests in `test/` directory with `.test.ts` extension
- Use descriptive test names that explain the scenario
- Test both success and failure cases
- Mock network operations when appropriate for unit tests
- Use integration tests for real mDNS flows
- **Always use `get-port` for dynamic port allocation** to avoid port conflicts

Example test structure:
```typescript
import assert from 'assert';
import test from 'test';
import { discoverServices } from '../src/discover.ts';

test('discover returns empty array when no services found', async () => {
  const services = await discoverServices({
    cluster: 'nonexistent',
    serviceName: 'missing',
    timeoutMs: 500
  });
  assert.deepEqual(services, []);
});
```

Example with dynamic ports:
```typescript
import getPort from 'get-port';
import { WebSocketServer } from 'ws';

test('WebSocket server test', async () => {
  const port = await getPort(); // Get available port dynamically
  const wss = new WebSocketServer({ port });
  // ... rest of test
});
```

## Version Support

- The library targets Node >=24 runtime (configurable in package.json)
- CI tests ensure compatibility across supported Node versions
- Use modern JavaScript/TypeScript features appropriate for target versions

## Adding New Features

Before adding a new feature:

1. Open an issue to discuss the feature and get feedback
2. Ensure it aligns with the library's scope (service discovery, not MCP implementation)
3. Consider backward compatibility
4. Update documentation (README.md, JSDoc comments)
5. Add tests covering the new functionality
6. Update CHANGELOG.md with the changes

## Release Process

1. Ensure working directory is clean and all tests pass
2. Update CHANGELOG.md with notable changes under appropriate version
3. Run `npm run build` (includes typecheck)
4. Bump version: `npm version <patch|minor|major>`
5. Push with tags: `git push && git push --tags`
6. Publish: `npm publish`
7. Create GitHub release with changelog notes

## Security

If you discover a security issue:

1. **Do NOT open a public issue**
2. Email the maintainer directly (see package.json for contact)
3. Include detailed steps to reproduce
4. Allow time for a fix before public disclosure

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Assume good intentions

## Questions / Issues

- **Bug reports**: Open an issue with reproduction steps
- **Feature requests**: Open an issue with use case and rationale
- **Questions**: Check README FAQ first, then open a discussion
- **Security**: Email maintainer directly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Happy hacking!
