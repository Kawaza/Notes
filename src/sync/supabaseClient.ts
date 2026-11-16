import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Supabase builds: sign-in required; personal notes live in the cloud (no local notes file/cache). */
export function isCloudOnlyMode(): boolean {
  return isSupabaseConfigured();
}

/** @deprecated Use {@link isCloudOnlyMode}. */
export function isDesktopCloudOnly(): boolean {
  return isCloudOnlyMode();
}

/** When false (default), sign-up does not send confirmation emails or use redirect links. */
export function isSignupEmailConfirmEnabled(): boolean {
  const raw = import.meta.env.VITE_SIGNUP_EMAIL_CONFIRM as string | undefined;
  return raw === 'true' || raw === '1';
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(url!, anonKey!, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
