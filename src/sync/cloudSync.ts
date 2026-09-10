import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { SyncPayload } from './types';

export function isSyncAvailable(): boolean {
  return isSupabaseConfigured() && supabase !== null;
}

export async function pullCloudData(
  userId: string,
): Promise<{ payload: SyncPayload; updatedAt: string } | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_sync_data')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.data) return null;

  return {
    payload: data.data as SyncPayload,
    updatedAt: data.updated_at as string,
  };
}

export async function pushCloudData(userId: string, payload: SyncPayload): Promise<string> {
  if (!supabase) throw new Error('Sync is not configured');

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from('user_sync_data').upsert({
    user_id: userId,
    data: payload,
    updated_at: updatedAt,
  });

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
