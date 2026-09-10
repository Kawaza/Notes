import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../sync/supabaseClient';

interface AuthStore {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  authLoading: true,
  authError: null,

  initAuth: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ authLoading: false, session: null, user: null });
      return;
    }

    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      authLoading: false,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, authLoading: false });
    });
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Cloud sync is not configured');
    set({ authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ authError: error.message });
      throw error;
    }
  },

  signUp: async (email, password) => {
    if (!supabase) throw new Error('Cloud sync is not configured');
    set({ authError: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ authError: error.message });
      throw error;
    }
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null, authError: null });
  },

  clearAuthError: () => set({ authError: null }),
}));
