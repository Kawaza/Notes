import { supabase } from './supabaseClient';
import type { UserProfile } from '../types/profile';
import { profileFullName } from '../types/profile';

function mapProfile(row: Record<string, unknown>): UserProfile {
  const firstName = (row.first_name as string | null) ?? '';
  const lastName = (row.last_name as string | null) ?? '';
  const displayName = (row.display_name as string | null) ?? null;
  return {
    userId: row.user_id as string,
    firstName,
    lastName,
    displayName,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data);
}

export async function upsertMyProfile(input: {
  firstName: string;
  lastName: string;
}): Promise<UserProfile> {
  if (!supabase) throw new Error('Sign in required');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const displayName = profileFullName({ firstName, lastName, displayName: null }) || null;
  const row = {
    user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('user_profiles').upsert(row).select('*').single();
  if (error) throw error;
  if (displayName) {
    await supabase.from('company_members').update({ display_name: displayName }).eq('user_id', user.id);
  }
  return mapProfile(data);
}

export async function fetchProfilesForUsers(userIds: string[]): Promise<UserProfile[]> {
  if (!supabase || userIds.length === 0) return [];
  const unique = [...new Set(userIds)];
  const { data, error } = await supabase.from('user_profiles').select('*').in('user_id', unique);
  if (error) throw error;
  return (data ?? []).map(mapProfile);
}
