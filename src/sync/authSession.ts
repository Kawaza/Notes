import { supabase } from './supabaseClient';

const SESSION_CHECK_MIN_MS = 45_000;

let lastSessionCheckAt = 0;

/** Local session check only — Supabase client refreshes tokens via autoRefreshToken. */
export async function ensureFreshSession(): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is not configured');

  const now = Date.now();
  if (now - lastSessionCheckAt < SESSION_CHECK_MIN_MS) return;
  lastSessionCheckAt = now;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    throw new Error('Session expired. Sign out and sign in again.');
  }

  const expiresMs = (data.session.expires_at ?? 0) * 1000;
  if (expiresMs > 0 && expiresMs < Date.now()) {
    throw new Error('Session expired. Sign out and sign in again.');
  }
}

export async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
