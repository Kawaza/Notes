const CONFIRMED_PATH = '/auth/confirmed';

/** Desktop email links open the Notes app directly (add to Supabase → Redirect URLs). */
export const DESKTOP_AUTH_REDIRECT_URL = 'notes://auth/confirmed';

function envRedirectUrl(): string | undefined {
  const raw = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function getEmailAuthRedirectUrl(): string | undefined {
  const fromEnv = envRedirectUrl();
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    return DESKTOP_AUTH_REDIRECT_URL;
  }

  if (typeof window === 'undefined') return undefined;

  const { origin } = window.location;
  if (!origin || origin === 'null' || origin.startsWith('file:')) return undefined;

  return `${origin.replace(/\/$/, '')}${CONFIRMED_PATH}`;
}

export function isAuthConfirmedRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return path === CONFIRMED_PATH || path.endsWith(CONFIRMED_PATH);
}

export function parseAuthCallbackHash(): {
  ok: boolean;
  error?: string;
  errorDescription?: string;
} {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { ok: true };
  const params = new URLSearchParams(hash);
  const error = params.get('error');
  if (error) {
    return {
      ok: false,
      error,
      errorDescription: params.get('error_description') ?? undefined,
    };
  }
  return { ok: true };
}

export type AuthDeepLinkResult = 'confirmed' | 'expired' | 'error';

/** Parse notes://auth/confirmed#... after the user taps the email link. */
export function parseAuthDeepLink(url: string): AuthDeepLinkResult {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.replace(/^#/, '');
    if (hash) {
      const params = new URLSearchParams(hash);
      const error = params.get('error');
      if (error) {
        const description = (params.get('error_description') ?? '').toLowerCase();
        if (error === 'access_denied' && (description.includes('expired') || description.includes('invalid'))) {
          return 'expired';
        }
        return 'error';
      }
      if (params.get('access_token') || params.get('type') === 'signup') {
        return 'confirmed';
      }
    }
    if (parsed.pathname.includes('confirmed') || parsed.host === 'auth') {
      return 'confirmed';
    }
  } catch {
    return 'error';
  }
  return 'confirmed';
}
