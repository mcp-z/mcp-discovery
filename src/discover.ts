import { Bonjour } from 'bonjour-service';
import type { LaunchInfo, ServiceInfo } from './types.ts';

export interface DiscoverOpts {
  cluster: string;
  serviceName: string;
  timeoutMs?: number;
}

export async function discoverServices(opts: DiscoverOpts): Promise<ServiceInfo[]> {
  const { cluster, serviceName, timeoutMs = 1500 } = opts;
  const bonjour = new Bonjour();
  const results: ServiceInfo[] = [];

  return new Promise((resolve) => {
    const browser = bonjour.find({ type: 'mcp', protocol: 'tcp' }, (s) => {
      const txt = (s.txt ?? {}) as Record<string, string>;
      if (txt.cluster === cluster && txt.name === serviceName) {
        let launch;
        if (txt.launchB64) {
          try {
            launch = JSON.parse(Buffer.from(txt.launchB64, 'base64').toString('utf8')) as LaunchInfo;
          } catch {}
        }
        results.push({
          cluster,
          serviceName,
          serviceKind: 'mcp',
          transport: (txt.transport as any) || 'http',
          port: s.port ?? 0,
          path: txt.path || '/mcp',
          ...(txt.version && { version: txt.version }),
          ...(txt.capsUrl && { capsUrl: txt.capsUrl }),
          auth: (txt.auth as any) || 'psk',
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
