export type Transport = 'http' | 'ws';
export type AuthKind = 'psk' | 'mtls';

export interface LaunchInfo {
  mode: 'stdio';
  cmd: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ServiceAdvert {
  cluster: string;
  serviceName: string;
  serviceKind?: 'mcp';
  transport: Transport;
  port: number;
  path?: string;
  version?: string;
  capsUrl?: string;
  auth?: AuthKind;
  node: string;
  launch?: LaunchInfo;
}

export interface ServiceInfo extends ServiceAdvert {
  host: string;
}
