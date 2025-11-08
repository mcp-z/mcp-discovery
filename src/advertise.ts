import { Bonjour, type Service } from 'bonjour-service';
import type { ServiceAdvert } from './types.ts';

export interface AdvertiseResult {
  /**
   * Promise that resolves when the mDNS advertisement is successfully published
   * This is crucial for synchronization - tests should await this before attempting discovery
   */
  ready: Promise<void>;

  /**
   * Cleanup function to stop mDNS advertisement and destroy Bonjour instance
   */
  cleanup: () => void;
}

/**
 * Advertise an MCP service via mDNS
 *
 * Returns a Promise that resolves when the service is successfully published to the network.
 * The Service instance emits an 'up' event after the first successful mDNS response broadcast.
 *
 * @example
 * ```typescript
 * const { ready, cleanup } = advertiseService({
 *   cluster: 'test-cluster',
 *   serviceName: 'my-service',
 *   transport: 'http',
 *   port: 3000,
 *   node: String(process.pid)
 * });
 *
 * // Wait for advertisement to be published
 * await ready;
 *
 * // Now discovery will reliably find the service
 * const services = await discoverServices({ cluster: 'test-cluster', serviceName: 'my-service' });
 *
 * // Cleanup when done
 * cleanup();
 * ```
 */
export function advertiseService(ad: ServiceAdvert, opts?: { includeLaunchInTxt?: boolean }): AdvertiseResult {
  const bonjour = new Bonjour();
  const { cluster, serviceName, transport, port, path = '/mcp', version = '1.0.0', capsUrl, auth = 'psk', node, launch } = ad;
  const txt: Record<string, string> = { cluster, name: serviceName, kind: 'mcp', transport, path, version, auth, node };
  if (capsUrl) txt.capsUrl = capsUrl;
  if (opts?.includeLaunchInTxt && launch) {
    try {
      const compact = JSON.stringify(launch);
      txt.launchB64 = Buffer.from(compact, 'utf8').toString('base64');
    } catch {}
  }
  console.log(`${serviceName}:${node}`);
  const service: Service = bonjour.publish({ name: `${serviceName}:${node}`, type: 'mcp', protocol: 'tcp', port, txt });

  // Create Promise that resolves when mDNS advertisement is published
  // The service emits 'up' event after first successful mDNS response broadcast
  const ready = new Promise<void>((resolve, reject) => {
    // Resolve when service is successfully published
    service.once('up', () => {
      resolve();
    });

    // Reject on error (though bonjour-service doesn't emit error events currently)
    // This provides forward compatibility if error handling is added
    service.once('error', (err: Error) => {
      reject(err);
    });

    // Timeout after 10 seconds - mDNS should publish quickly, but allow extra time for network delays
    // Note: If multiple transports try to advertise with the same name, the second will never emit 'up'
    // and will timeout here. This is expected behavior for misconfigured servers.
    const timeout = setTimeout(() => {
      reject(new Error(`mDNS advertisement timeout for ${serviceName}:${node} (${transport}:${port})`));
    }, 10000);

    // Clear timeout when 'up' fires
    service.once('up', () => clearTimeout(timeout));
  });

  service.start?.();

  const cleanup = () => {
    try {
      service.stop?.();
    } catch {}
    try {
      bonjour.destroy();
    } catch {}
  };

  return { ready, cleanup };
}
