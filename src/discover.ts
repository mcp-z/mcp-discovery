import { Bonjour } from 'bonjour-service';
import type { AuthKind, LaunchInfo, ServiceInfo, Transport } from './types.ts';

export interface DiscoverOpts {
  cluster: string;
  serviceName: string;
  timeoutMs?: number;
}

/**
 * Type guard to validate transport values from mDNS TXT records
 */
function isValidTransport(value: unknown): value is Transport {
  return value === 'http' || value === 'ws';
}

/**
 * Type guard to validate auth kind values from mDNS TXT records
 */
function isValidAuthKind(value: unknown): value is AuthKind {
  return value === 'psk' || value === 'mtls';
}

export async function discoverServices(opts: DiscoverOpts): Promise<ServiceInfo[]> {
  const { cluster, serviceName, timeoutMs = 1500 } = opts;
  const bonjour = new Bonjour();
  const results: ServiceInfo[] = [];

  return new Promise((resolve) => {
    const browser = bonjour.find({ type: 'mcp', protocol: 'tcp' }, (s) => {
      const txt = (s.txt ?? {}) as Record<string, string>;
      if (txt.cluster === cluster && txt.name === serviceName) {
        // Parse and validate launch info from base64 TXT record
        let launch: LaunchInfo | undefined;
        if (txt.launchB64) {
          try {
            const parsed = JSON.parse(Buffer.from(txt.launchB64, 'base64').toString('utf8'));
            // Validate that parsed data matches LaunchInfo structure
            if (parsed && typeof parsed === 'object' && 'mode' in parsed && parsed.mode === 'stdio' && 'cmd' in parsed && typeof parsed.cmd === 'string') {
              launch = parsed as LaunchInfo;
            }
          } catch {
            // Invalid launch info - leave undefined
          }
        }

        results.push({
          cluster,
          serviceName,
          serviceKind: 'mcp',
          transport: isValidTransport(txt.transport) ? txt.transport : 'http',
          port: s.port ?? 0,
          path: txt.path || '/mcp',
          ...(txt.version && { version: txt.version }),
          ...(txt.capsUrl && { capsUrl: txt.capsUrl }),
          auth: isValidAuthKind(txt.auth) ? txt.auth : 'psk',
          node: txt.node || 'unknown',
          host: s.host || s.fqdn,
          ...(launch && { launch }),
        });
      }
    });
    setTimeout(() => {
      try {
        browser.stop();
      } catch {}
      try {
        bonjour.destroy();
      } catch {}
      resolve(results);
    }, timeoutMs);
  });
}

export function toBaseUrl(s: ServiceInfo): string {
  const host = s.host.includes('.') ? s.host : `${s.host}.local`;
  if (s.transport === 'http') {
    const p = s.path?.startsWith('/') ? s.path : `/${s.path || ''}`;
    return `http://${host}:${s.port}${p}`;
  }
  if (s.transport === 'ws') {
    const p = s.path?.startsWith('/') ? s.path : `/${s.path || ''}`;
    return `ws://${host}:${s.port}${p}`;
  }
  return `${host}:${s.port}`;
}
