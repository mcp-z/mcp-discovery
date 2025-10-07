# Changelog

All notable changes to this project will be documented here.

The format follows [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Initial Release

#### Core Features
- mDNS/DNS-SD service discovery for MCP servers
- Service advertisement with `advertiseService()`
- Service discovery with `discoverServices()`
- Support for HTTP and WebSocket transports
- Optional PSK (Pre-Shared Key) authentication helpers
- Version-based service selection and filtering
- Helper utilities: `toBaseUrl()`, `buildAuthHeader()`, `verifyPskHmac()`, `expressPskHmac()`

#### Transport Support
- HTTP transport: Full support with official MCP SDK `StreamableHTTPClientTransport`
- WebSocket transport: Client (SDK) + Server (included `WebSocketServerTransport`)
- Dual ESM/CJS module support

#### Developer Experience
- TypeScript support with full type definitions
- Comprehensive test suite (17 tests, all passing)
- Biome formatting and linting
- Multi-version Node.js compatibility (>=24)
- Extensive documentation with real-world examples
- Integration examples for both HTTP and WebSocket

#### Documentation
- Complete README with quick start, API reference, and FAQ
- Full integration examples with official MCP SDK
- PSK authentication patterns and security guidance
- Version selection strategies and filtering patterns
- Transport comparison and selection guidance

## Notes

This is the initial release of @mcp-z/mcp-discovery, providing zero-configuration service discovery for Model Context Protocol servers on local networks.
