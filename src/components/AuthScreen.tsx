import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import { NotesLogo } from './NotesLogo';

export function AuthScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center"><NotesLogo /></div>
          <h1 className="text-xl font-semibold">Cloud sync not configured</h1>
          <p className="text-sm text-muted-foreground">
            Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable the web app.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearAuthError();
    try {
      if (mode === 'sign-in') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch {
      // authError set in store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background safe-area-padding">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><NotesLogo /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access your notes on any device.
            </p>
          </div>
        </div>

        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setMode('sign-in');
              clearAuthError();
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors cursor-pointer ${
              mode === 'sign-in' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('sign-up');
              clearAuthError();
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors cursor-pointer ${
              mode === 'sign-up' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="auth-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="auth-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {authError && (
            <p className="text-sm text-destructive">{authError}</p>
          )}

          {mode === 'sign-up' && (
            <p className="text-xs text-muted-foreground">
              Check your email to confirm your account if confirmation is enabled in Supabase.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
