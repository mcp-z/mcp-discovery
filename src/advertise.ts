import { Bonjour, type Service } from 'bonjour-service';
import type { ServiceAdvert } from './types.ts';

export function advertiseService(ad: ServiceAdvert, opts?: { includeLaunchInTxt?: boolean }): () => void {
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
  service.start?.();
  return () => {
    try {
      service.stop?.();
    } catch {}
    try {
      bonjour.destroy();
    } catch {}
  };
}
