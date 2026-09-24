import { supabase } from './supabaseClient';
import type { SyncPayload } from './types';

/** PostgREST / hosted Supabase request body limit (conservative). */
export const MAX_SYNC_BYTES = 4 * 1024 * 1024;

export function estimateSyncPayloadBytes(payload: SyncPayload): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

export function formatSyncPayloadSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSyncError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    const parts: string[] = [];
    if (e.message) parts.push(e.message);
    if (e.details && e.details !== e.message) parts.push(e.details);
    if (e.hint) parts.push(e.hint);
    if (e.code) parts.push(`code ${e.code}`);
    if (parts.length) return parts.join(' — ');
  }
  return 'Sync failed';
}

export async function withSyncTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out. Check your connection and try again.`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function ensureFreshSession(): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is not configured');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    throw new Error('Session expired. Sign out and sign in again.');
  }

  const expiresAt = data.session.expires_at ?? 0;
  const expiresMs = expiresAt * 1000;
  if (expiresMs > 0 && expiresMs < Date.now() + 60_000) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) {
      throw new Error(`Session refresh failed: ${refreshed.error.message}`);
    }
    if (!refreshed.data.session) {
      throw new Error('Session expired. Sign out and sign in again.');
    }
  }
}

export function assertSyncPayloadSize(payload: SyncPayload): void {
  const bytes = estimateSyncPayloadBytes(payload);
  if (bytes <= MAX_SYNC_BYTES) return;

  throw new Error(
    `Notes data is too large to upload (${formatSyncPayloadSize(bytes)}; limit ~${formatSyncPayloadSize(MAX_SYNC_BYTES)}). ` +
      'Remove large embedded images or attachments from notes, then try Sync now.',
  );
}
