import crypto from 'crypto';
import type { NextApiRequest } from 'next';

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_ATTEMPTS = 10; // 10 attempts per window
export const RATE_LIMIT_BLOCK_TIME_MS = 60 * 60 * 1000; // 1 hour block
export const RATE_LIMIT_MAX_ENTRIES = 5000;

export interface RateLimitRecord {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Constant-time token comparison via SHA-256 digests so length differences
 * never trigger an early exit.
 */
export function timingSafeTokenEqual(provided: unknown, expected: unknown): boolean {
  if (typeof provided !== 'string' || typeof expected !== 'string' || !provided || !expected) {
    return false;
  }
  const providedDigest = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const expectedDigest = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Verify the x-admin-key header against ADMIN_API_KEY. Fails closed if unset.
 */
export function isValidAdminKey(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return false;
  }
  return timingSafeTokenEqual(req.headers['x-admin-key'], adminKey);
}

export function isLoopbackAddress(addr: string | undefined): boolean {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

export function getCfConnectingIp(req: NextApiRequest): string {
  const raw = req.headers['cf-connecting-ip'];
  if (typeof raw === 'string') {
    return raw.split(',')[0].trim();
  }
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
    return raw[0].split(',')[0].trim();
  }
  return '';
}

/**
 * Resolve the client IP from Cloudflare's cf-connecting-ip header, falling back
 * to the socket remote address. Never trusts x-forwarded-for.
 */
export function getClientIp(req: NextApiRequest): string {
  const cfIp = getCfConnectingIp(req);
  if (cfIp) {
    return cfIp;
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Check ADMIN_IP_WHITELIST if configured. Loopback bypass is allowed only in
 * non-production when the actual socket is loopback and cf-connecting-ip is absent.
 */
export function checkAdminIpWhitelist(req: NextApiRequest): boolean {
  const cfIp = getCfConnectingIp(req);
  const remoteAddr = req.socket?.remoteAddress || '';

  if (process.env.NODE_ENV !== 'production' && !cfIp && isLoopbackAddress(remoteAddr)) {
    return true;
  }

  const clientIp = cfIp || remoteAddr;
  const whitelist = (process.env.ADMIN_IP_WHITELIST || '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);

  if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
    console.warn(`Admin API: Blocked IP ${clientIp || 'unknown'} not in whitelist`);
    return false;
  }

  return true;
}

export function evictRateLimitStoreIfNeeded(
  store: Map<string, RateLimitRecord>,
  now: number,
  maxEntries: number = RATE_LIMIT_MAX_ENTRIES
): void {
  if (store.size < maxEntries) {
    return;
  }

  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetTime) {
      store.delete(key);
    }
  }
  if (store.size < maxEntries) {
    return;
  }

  // Prefer evicting oldest unblocked entries so a flood cannot clear active blocks.
  for (const [key, entry] of store.entries()) {
    if (!entry.blocked) {
      store.delete(key);
      if (store.size < maxEntries) {
        return;
      }
    }
  }

  for (const key of store.keys()) {
    store.delete(key);
    if (store.size < maxEntries) {
      return;
    }
  }
}

export function checkAdminRateLimit(
  ip: string,
  now: number = Date.now(),
  store: Map<string, RateLimitRecord> = rateLimitStore,
  maxEntries: number = RATE_LIMIT_MAX_ENTRIES
): boolean {
  const record = store.get(ip);

  if (!record) {
    evictRateLimitStoreIfNeeded(store, now, maxEntries);
    store.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS, blocked: false });
    return true;
  }

  if (record.blocked && now < record.resetTime) {
    return false;
  }

  if (now >= record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    record.blocked = false;
    return true;
  }

  record.count++;

  if (record.count > RATE_LIMIT_MAX_ATTEMPTS) {
    record.blocked = true;
    record.resetTime = now + RATE_LIMIT_BLOCK_TIME_MS;
    console.warn(`Admin API: IP ${ip} blocked for excessive attempts`);
    return false;
  }

  return true;
}

export function isBypassStaticRequested(req: NextApiRequest): boolean {
  const param = req.query.bypass_static;
  return Array.isArray(param) ? param.includes('true') : param === 'true';
}
