import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { isDesktopCloudOnly, isSupabaseConfigured } from '../sync/supabaseClient';
import { NotesLogo } from './NotesLogo';
import { AuthPendingEmailPanel } from './AuthPendingEmailPanel';

export function AuthScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const authError = useAuthStore((s) => s.authError);
  const authFeedback = useAuthStore((s) => s.authFeedback);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);
  const acknowledgeEmailPending = useAuthStore((s) => s.acknowledgeEmailPending);
  const resendSignupConfirmation = useAuthStore((s) => s.resendSignupConfirmation);
  const emailLinkNotice = useAuthStore((s) => s.emailLinkNotice);
  const clearEmailLinkNotice = useAuthStore((s) => s.clearEmailLinkNotice);

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0);

  const pendingEmail = authFeedback.kind === 'check_email' ? authFeedback.email : null;
  const existingAccountEmail =
    authFeedback.kind === 'existing_account' ? authFeedback.email : null;

  useEffect(() => {
    if (!existingAccountEmail) return;
    setMode('sign-in');
    setEmail(existingAccountEmail);
  }, [existingAccountEmail]);

  const statusMessage =
    authFeedback.kind === 'signing_in'
      ? 'Signing in…'
      : authFeedback.kind === 'creating_account'
        ? 'Creating your account…'
        : null;

  const resetToSignUp = () => {
    acknowledgeEmailPending();
    setMode('sign-up');
    setEmail('');
    setPassword('');
    clearAuthError();
    setResendMessage(null);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background mobile-page-padding">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center"><NotesLogo /></div>
          <h1 className="text-xl font-semibold">Cloud sync not configured</h1>
          <p className="text-sm text-muted-foreground">
            Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable the app.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearAuthError();
    setResendMessage(null);
    try {
      if (mode === 'sign-in') await signIn(email.trim(), password);
      else
        await signUp(email.trim(), password, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
    } catch {
      // authError set in store
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const target = pendingEmail ?? email.trim();
    if (!target) return;
    setResending(true);
    setResendMessage(null);
    try {
      await resendSignupConfirmation(target);
      setResendMessage('We sent another confirmation email.');
      setResendCooldownUntil(Date.now() + 120_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not resend email';
      setResendMessage(msg.includes('rate') || msg.toLowerCase().includes('limit')
        ? 'Too many emails sent. Please wait a few minutes before resending.'
        : msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background mobile-page-padding">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><NotesLogo /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isDesktopCloudOnly()
                ? 'Create an account or sign in to access your notes.'
                : 'Sign in to access your notes on any device.'}
            </p>
          </div>
        </div>

        {emailLinkNotice === 'confirmed' && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm space-y-2">
            <p className="font-medium text-foreground">Email confirmed</p>
            <p className="text-muted-foreground">Sign in with your email and password to continue.</p>
            <button
              type="button"
              onClick={() => {
                clearEmailLinkNotice();
                setMode('sign-in');
              }}
              className="text-sm font-medium text-primary cursor-pointer"
            >
              Continue to sign in
            </button>
          </div>
        )}

        {emailLinkNotice === 'expired' && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm space-y-2">
            <p className="font-medium text-foreground">That link has expired</p>
            <p className="text-muted-foreground">
              Request a new confirmation email below, or create your account again.
            </p>
            <button
              type="button"
              onClick={clearEmailLinkNotice}
              className="text-sm font-medium text-primary cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        {statusMessage && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin shrink-0" />
            {statusMessage}
          </div>
        )}

        {existingAccountEmail && !pendingEmail && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground leading-relaxed space-y-2">
            <p className="font-medium text-foreground">This email is already registered</p>
            <p>Sign in with your password below.</p>
          </div>
        )}

        {pendingEmail ? (
          <AuthPendingEmailPanel
            email={pendingEmail}
            resending={resending}
            resendMessage={resendMessage}
            onResend={() => void handleResend()}
            resendDisabled={Date.now() < resendCooldownUntil}
            onBackToSignIn={() => {
              acknowledgeEmailPending();
              setMode('sign-in');
              setEmail(pendingEmail);
              clearAuthError();
            }}
            onUseDifferentEmail={resetToSignUp}
          />
        ) : (
          <>
            <div className="flex rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('sign-in');
                  clearAuthError();
                  setResendMessage(null);
                  acknowledgeEmailPending();
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
                  setResendMessage(null);
                  acknowledgeEmailPending();
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors cursor-pointer ${
                  mode === 'sign-up' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'sign-up' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="auth-first" className="text-sm font-medium">
                      First name
                    </label>
                    <input
                      id="auth-first"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="auth-last" className="text-sm font-medium">
                      Last name
                    </label>
                    <input
                      id="auth-last"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}
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
                <p className="text-sm text-destructive leading-relaxed">{authError}</p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  authFeedback.kind === 'signing_in' ||
                  authFeedback.kind === 'creating_account'
                }
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {(submitting || statusMessage) && <Loader2 size={16} className="animate-spin" />}
                {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            {mode === 'sign-up' && !pendingEmail && (
              <p className="text-xs text-center text-muted-foreground">
                You&apos;ll be signed in right after your account is created.
              </p>
            )}
          </>
        )}

      </div>
    </div>
  );
}
