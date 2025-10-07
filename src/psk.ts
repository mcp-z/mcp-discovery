import crypto from 'node:crypto';

export function buildAuthHeader(secret: string, method: string, path: string, body?: unknown) {
  const ts = new Date().toISOString();
  const nonce = crypto.randomBytes(12).toString('base64');
  const bodyHash = body ? crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex') : '';
  const data = [method.toUpperCase(), path, ts, nonce, bodyHash].join('|');
  const mac = crypto.createHmac('sha256', secret).update(data).digest('base64');
  return `MCP-HMAC id=client, ts=${ts}, nonce=${nonce}, mac=${mac}`;
}

export function verifyPskHmac(opts: { secret: string; method: string; path: string; body?: unknown; authHeader?: string }) {
  const { secret, method, path, body, authHeader } = opts;
  if (!authHeader || !authHeader.startsWith('MCP-HMAC ')) return false;
  const parts = Object.fromEntries(
    authHeader
      .slice(9)
      .split(',')
      .map((kv) => {
        const trimmed = kv.trim();
        const eqIdx = trimmed.indexOf('=');
        return eqIdx > 0 ? [trimmed.slice(0, eqIdx), trimmed.slice(eqIdx + 1)] : [trimmed, ''];
      })
  );
  const { id, ts, nonce, mac } = parts as Record<string, string>;
  if (!id || !ts || !nonce || !mac) return false;
  if (Math.abs(Date.now() - Date.parse(ts)) > 60_000) return false;

  const bodyHash = body ? crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex') : '';
  const data = [method.toUpperCase(), path, ts, nonce, bodyHash].join('|');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
  } catch {
    return false;
  }
}

export function expressPskHmac(secret: string) {
  const seen = new Set<string>();
  return (req: any, res: any, next: any) => {
    const hdr: string | undefined = req.headers?.authorization ?? req.header?.('authorization');
    if (!hdr || !hdr.startsWith('MCP-HMAC ')) return res?.status?.(401)?.end?.();
    const ok = verifyPskHmac({ secret, method: req.method, path: req.originalUrl || req.url, body: req.body, authHeader: hdr });
    if (!ok) return res?.status?.(401)?.end?.();
    const nonce = hdr.split('nonce=')[1]?.split(',')[0]?.trim();
    if (nonce) {
      if (seen.has(nonce)) return res?.status?.(401)?.end?.();
      seen.add(nonce);
      setTimeout(() => seen.delete(nonce), 120000);
    }
    return typeof next === 'function' ? next() : undefined;
  };
}
