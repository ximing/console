import crypto from 'crypto';

interface OAuthStateEntry {
  origin: string;
  expiresAt: number;
}

const store = new Map<string, OAuthStateEntry>();

export function createOAuthState(origin: string): string {
  // opportunistic cleanup
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
  const state = crypto.randomBytes(24).toString('hex');
  store.set(state, { origin, expiresAt: now + 10 * 60 * 1000 });
  return state;
}

export function consumeOAuthState(state: string): OAuthStateEntry | null {
  const entry = store.get(state);
  store.delete(state);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry;
}
