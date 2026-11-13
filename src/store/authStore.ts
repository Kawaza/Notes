import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../sync/supabaseClient';
import { getEmailAuthRedirectUrl, parseAuthDeepLink } from '../sync/authRedirect';
import { useEncryptionStore } from './encryptionStore';
import type { UserProfile } from '../types/profile';
import { fetchMyProfile, upsertMyProfile } from '../sync/profileSync';

export type AuthFeedback =
  | { kind: 'idle' }
  | { kind: 'check_email'; email: string }
  | { kind: 'existing_account'; email: string }
  | { kind: 'signing_in' }
  | { kind: 'creating_account' };

interface AuthStore {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  authFeedback: AuthFeedback;
  emailLinkNotice: 'confirmed' | 'expired' | null;
  initAuth: () => Promise<void>;
  applyAuthDeepLink: (url: string) => Promise<void>;
  clearEmailLinkNotice: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    names?: { firstName: string; lastName: string },
  ) => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfileNames: (firstName: string, lastName: string) => Promise<void>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  clearAuthError: () => void;
  clearAuthFeedback: () => void;
  acknowledgeEmailPending: () => void;
}

function isEmailNotConfirmedMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('email not confirmed') ||
    lower.includes('not confirmed') ||
    lower.includes('email_not_confirmed')
  );
}

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('rate limit') || lower.includes('too many') || lower.includes('over_email_send_rate_limit');
}

function friendlyAuthError(message: string): string {
  if (isRateLimitError(message)) {
    return 'Too many emails were sent. Please wait a few minutes, then try Resend or sign in if you already confirmed.';
  }
  if (isEmailNotConfirmedMessage(message)) {
    return 'Confirm your email before signing in. Check your inbox for the link we sent you.';
  }
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  return message;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  authLoading: true,
  authError: null,
  authFeedback: { kind: 'idle' },
  emailLinkNotice: null,

  applyAuthDeepLink: async (url) => {
    const result = parseAuthDeepLink(url);
    if (result === 'confirmed') {
      set({ emailLinkNotice: 'confirmed', authFeedback: { kind: 'idle' }, authError: null });
      return;
    }
    if (result === 'expired') {
      set({ emailLinkNotice: 'expired' });
      return;
    }
    set({ emailLinkNotice: 'expired' });
  },

  clearEmailLinkNotice: () => set({ emailLinkNotice: null }),

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
    if (data.session?.user) void get().loadProfile();

    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null, authLoading: false, authFeedback: { kind: 'idle' } });
      if (session?.user) {
        const shouldLoadProfile =
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          !get().profile;
        if (shouldLoadProfile) void get().loadProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  loadProfile: async () => {
    try {
      const profile = await fetchMyProfile();
      set({ profile });
    } catch (err) {
      console.error(err);
    }
  },

  updateProfileNames: async (firstName, lastName) => {
    const profile = await upsertMyProfile({ firstName, lastName });
    set({ profile });
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Cloud sync is not configured');
    set({ authError: null, authFeedback: { kind: 'signing_in' } });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = friendlyAuthError(error.message);
      set({
        authError: msg,
        authFeedback: isEmailNotConfirmedMessage(error.message)
          ? { kind: 'check_email', email }
          : { kind: 'idle' },
      });
      throw error;
    }
    set({ authFeedback: { kind: 'idle' } });
    useEncryptionStore.getState().setVaultFromSignIn(password);
    await get().loadProfile();
  },

  signUp: async (email, password, names) => {
    if (!supabase) throw new Error('Cloud sync is not configured');
    set({ authError: null, authFeedback: { kind: 'creating_account' } });
    const redirectTo = getEmailAuthRedirectUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (error) {
      set({ authError: friendlyAuthError(error.message), authFeedback: { kind: 'idle' } });
      throw error;
    }

    if (data.session) {
      set({ authFeedback: { kind: 'idle' } });
      useEncryptionStore.getState().setVaultFromSignIn(password);
      if (names?.firstName?.trim() || names?.lastName?.trim()) {
        await upsertMyProfile({
          firstName: names.firstName.trim(),
          lastName: names.lastName.trim(),
        });
        await get().loadProfile();
      }
      return;
    }

    if (data.user?.identities?.length === 0) {
      set({
        authFeedback: { kind: 'existing_account', email },
        authError: null,
      });
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!signInError && signInData.session) {
      set({ authFeedback: { kind: 'idle' } });
      useEncryptionStore.getState().setVaultFromSignIn(password);
      if (names?.firstName?.trim() || names?.lastName?.trim()) {
        await upsertMyProfile({
          firstName: names.firstName.trim(),
          lastName: names.lastName.trim(),
        });
      }
      await get().loadProfile();
      return;
    }

    if (signInError && isEmailNotConfirmedMessage(signInError.message)) {
      set({ authFeedback: { kind: 'check_email', email }, authError: null });
      return;
    }

    set({
      authFeedback: { kind: 'existing_account', email },
      authError: signInError ? friendlyAuthError(signInError.message) : null,
    });
  },

  resendSignupConfirmation: async (email) => {
    if (!supabase) throw new Error('Cloud sync is not configured');
    const redirectTo = getEmailAuthRedirectUrl();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (error) throw new Error(friendlyAuthError(error.message));
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    useEncryptionStore.getState().lock();
    set({ session: null, user: null, profile: null, authError: null, authFeedback: { kind: 'idle' } });
  },

  updatePassword: async (newPassword) => {
    if (!supabase) throw new Error('Cloud sync is not configured');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(friendlyAuthError(error.message));
    useEncryptionStore.getState().setVaultFromSignIn(newPassword);
  },

  clearAuthError: () => set({ authError: null }),

  clearAuthFeedback: () => set({ authFeedback: { kind: 'idle' } }),

  acknowledgeEmailPending: () => {
    const fb = get().authFeedback;
    if (fb.kind === 'check_email' || fb.kind === 'existing_account') {
      set({ authFeedback: { kind: 'idle' } });
    }
  },
}));

