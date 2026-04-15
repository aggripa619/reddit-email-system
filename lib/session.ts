export const COOKIE_NAME = 'reddit_dm_session';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createSession(username: string): Promise<string> {
  const secret = process.env.SESSION_SECRET!;
  const expiry = Date.now() + EXPIRY_MS;
  const payload = `${username}:${expiry}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${payload}:${sigHex}`;
}

export async function verifySession(cookie: string): Promise<boolean> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return false;
    const lastColon = cookie.lastIndexOf(':');
    const payload = cookie.slice(0, lastColon);
    const sigHex = cookie.slice(lastColon + 1);
    const [, expiry] = payload.split(':');
    if (Date.now() > parseInt(expiry)) return false;
    const key = await getKey(secret);
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}
