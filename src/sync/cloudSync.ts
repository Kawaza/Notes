import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { SyncPayload } from './types';
import { assertSyncPayloadSize, ensureFreshSession } from './syncUtils';
import { decryptSyncPayload } from './syncEncryption';
import { useEncryptionStore } from '../store/encryptionStore';

export type CloudDataRow = {
  data: SyncPayload | null;
  data_encrypted: string | null;
  encryption_version: number;
  updated_at: string;
};

export function isSyncAvailable(): boolean {
  return isSupabaseConfigured() && supabase !== null;
}

/** True if cloud row exists and uses client-side encryption (unlock required after refresh). */
export async function verifyVaultPassword(userId: string, password: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('user_sync_data')
    .select('data_encrypted')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.data_encrypted) return true;
  const salt = await useEncryptionStore.getState().ensureKdfSalt(userId);
  try {
    await decryptSyncPayload(data.data_encrypted, password, salt);
    return true;
  } catch {
    return false;
  }
}

export async function cloudSyncUsesEncryption(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('user_sync_data')
    .select('data_encrypted')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.data_encrypted);
}

export async function pullCloudData(
  userId: string,
): Promise<{ payload: SyncPayload; updatedAt: string } | null> {
  if (!supabase) return null;

  await ensureFreshSession();

  const { data, error } = await supabase
    .from('user_sync_data')
    .select('data, data_encrypted, encryption_version, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as CloudDataRow;

  if (row.data) {
    return {
      payload: row.data as SyncPayload,
      updatedAt: row.updated_at,
    };
  }

  if (row.data_encrypted) {
    const password = useEncryptionStore.getState().vaultPassword;
    if (!password) {
      console.warn('Legacy encrypted sync row; sign-in password not in memory — cannot decrypt.');
      return null;
    }
    try {
      const salt = await useEncryptionStore.getState().ensureKdfSalt(userId);
      const payload = await decryptSyncPayload(row.data_encrypted, password, salt);
      return { payload, updatedAt: row.updated_at };
    } catch {
      console.warn('Could not decrypt legacy encrypted sync data.');
      return null;
    }
  }

  return null;
}

export async function pushCloudData(userId: string, payload: SyncPayload): Promise<string> {
  if (!supabase) throw new Error('Sync is not configured');

  await ensureFreshSession();
  assertSyncPayloadSize(payload);

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from('user_sync_data').upsert(
    {
      user_id: userId,
      data: payload,
      data_encrypted: null,
      encryption_version: 0,
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  );

  if (error) throw error;
  return updatedAt;
}

export function subscribeCloudChanges(userId: string, onRemoteChange: () => void): () => void {
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`notes-sync:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_sync_data',
        filter: `user_id=eq.${userId}`,
      },
      () => onRemoteChange(),
    )
    .subscribe();

  return () => {
    if (supabase) void supabase.removeChannel(channel);
  };
}
