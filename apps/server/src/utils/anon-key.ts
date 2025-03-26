import crypto from 'crypto';

/** Anonymous like dedupe key: sha256(ip | userAgent | salt). */
export function buildAnonKey(ip: string, userAgent: string, salt: string): string {
  return crypto.createHash('sha256').update(`${ip}|${userAgent}|${salt}`).digest('hex');
}

/** Picks the dedupe identity for a like: logged-in visitor wins, otherwise anonymous key. */
export function resolveLikeActor(
  visitorId: string | null,
  anonKey: string
): { field: 'visitorId' | 'anonKey'; value: string } {
  return visitorId ? { field: 'visitorId', value: visitorId } : { field: 'anonKey', value: anonKey };
}
