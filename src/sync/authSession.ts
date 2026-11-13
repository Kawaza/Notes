import { supabase } from './supabaseClient';
import { useAuthStore } from '../store/authStore';

const SESSION_CHECK_MIN_MS = 45_000;

let lastSessionCheckAt = 0;

/** Local session check only — Supabase client refreshes tokens via autoRefreshToken. */
export async function ensureFreshSession(): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is not configured');

  const now = Date.now();
  if (now - lastSessionCheckAt < SESSION_CHECK_MIN_MS) return;
  lastSessionCheckAt = now;

  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error('Sign in again, then try once more.');
  }
}

export async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const fromSession = data.session?.user?.id;
  if (fromSession) return fromSession;
  return useAuthStore.getState().user?.id ?? null;
}
