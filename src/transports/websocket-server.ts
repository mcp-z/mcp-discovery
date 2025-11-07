import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';

/**
 * Server transport for WebSocket connections
 *
 * Implements the MCP Transport interface for server-side WebSocket communication.
 * This transport handles a single WebSocket connection from a client.
 *
 * @example
 * ```typescript
 * import { Server } from '@modelcontextprotocol/sdk/server/index.js';
 * import { WebSocketServer } from 'ws';
 * import { WebSocketServerTransport } from '@mcpeasy/mcp-discovery/transports/websocket-server.js';
 *
 * const wss = new WebSocketServer({ port: 8080 });
 *
 * wss.on('connection', (ws) => {
 *   const transport = new WebSocketServerTransport(ws);
 *   const server = new Server({ name: 'my-server', version: '1.0.0' }, { capabilities: {} });
 *
 *   await server.connect(transport);
 * });
 * ```
 */
export class WebSocketServerTransport implements Transport {
  private ws: WebSocket;
  private _sessionId: string;
  private _onMessageHandler?: (data: WebSocket.Data) => void;
  private _onErrorHandler?: (error: Error) => void;
  private _onCloseHandler?: () => void;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this._sessionId = '';
  }

  get sessionId(): string {
    return this._sessionId;
  }

  /**
   * Start processing messages on the WebSocket connection
   * Note: Called automatically by MCP Server, don't call explicitly
   */
  async start(): Promise<void> {
    // Set up message handler
    this._onMessageHandler = (data) => {
      try {
        const message = JSON.parse(data.toString()) as JSONRPCMessage;

        // Pass message to MCP Server
        if (this.onmessage) {
          this.onmessage(message);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.onerror?.(err);
      }
    };
    this.ws.on('message', this._onMessageHandler);

    // Set up error handler
    this._onErrorHandler = (error) => {
      this.onerror?.(error);
    };
    this.ws.on('error', this._onErrorHandler);

    // Set up close handler
    this._onCloseHandler = () => {
      this.onclose?.();
    };
    this.ws.on('close', this._onCloseHandler);
  }

  /**
   * Send a JSON-RPC message to the client
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not open');
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close the WebSocket connection
   */
  async close(): Promise<void> {
    // Remove event listeners
    if (this._onMessageHandler) {
      this.ws.off('message', this._onMessageHandler);
    }
    if (this._onErrorHandler) {
      this.ws.off('error', this._onErrorHandler);
    }
    if (this._onCloseHandler) {
      this.ws.off('close', this._onCloseHandler);
    }

    // Close the WebSocket
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
  }
}
