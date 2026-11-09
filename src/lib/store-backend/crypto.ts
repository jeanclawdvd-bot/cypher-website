import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export const SESSION_SECONDS = 24 * 60 * 60;
export const SESSION_COOKIE = 'ww_local_session';

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 32, SCRYPT, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(24).toString('hex');
  return { salt, hash: (await derive(password, salt)).toString('hex') };
}
export async function verifyPassword(password: string, salt: string, expected: string): Promise<boolean> {
  if (!/^[a-f0-9]{48}$/.test(salt) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(expected, 'hex'));
}
export function opaqueToken(): string { return randomBytes(32).toString('base64url'); }
export function opaqueId(prefix: string): string { return `${prefix}_${randomBytes(16).toString('hex')}`; }
export function tokenHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function csrfForSession(token: string): string { return tokenHash(`wilder-local-csrf-v1:${token}`); }
export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function readSessionCookie(request: Request): string | null {
  const matches = (request.headers.get('cookie') ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(`${SESSION_COOKIE}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(SESSION_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
export function sessionCookie(token: string, url: URL, clear = false): string {
  return `${SESSION_COOKIE}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${url.protocol === 'https:' ? '; Secure' : ''}`;
}
