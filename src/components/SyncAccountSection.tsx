import { useState } from 'react';
import { Loader2, RefreshCw, Upload } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../store/useStore';
import { isDesktopCloudOnly, isSupabaseConfigured } from '../sync/supabaseClient';
import type { SyncStatus } from '../sync/types';
import { AuthPendingEmailPanel } from './AuthPendingEmailPanel';

function syncLabel(status: SyncStatus, error: string | null): string {
  if (status === 'syncing') return 'Syncing…';
  if (status === 'synced') return 'Synced';
  if (status === 'error') return error ? 'Sync error' : 'Sync error';
  return 'Offline';
}

export function SyncAccountSection() {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const authError = useAuthStore((s) => s.authError);
  const authFeedback = useAuthStore((s) => s.authFeedback);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);
  const acknowledgeEmailPending = useAuthStore((s) => s.acknowledgeEmailPending);
  const resendSignupConfirmation = useAuthStore((s) => s.resendSignupConfirmation);
  const mergeAndUploadDeviceNotes = useStore((s) => s.mergeAndUploadDeviceNotes);
  const pullRemoteSync = useStore((s) => s.pullRemoteSync);
  const syncStatus = useStore((s) => s.syncStatus);
  const syncError = useStore((s) => s.syncError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const pendingEmail = authFeedback.kind === 'check_email' ? authFeedback.email : null;
  const existingAccountEmail =
    authFeedback.kind === 'existing_account' ? authFeedback.email : null;

  const isElectron = Boolean(window.electronAPI?.isElectron);
  const cloudOnlyDesktop = isDesktopCloudOnly();

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">Cloud sync is not configured in this build.</p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearAuthError();
    setUploadMessage(null);
    try {
      if (mode === 'sign-in') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch {
      // authError set in store
    } finally {
      setSubmitting(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    setUploadMessage(null);
    try {
      await pullRemoteSync();
      setUploadMessage('Synced latest notes from the cloud.');
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setPulling(false);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadMessage(null);
    try {
      const { notes, folders } = await mergeAndUploadDeviceNotes();
      setUploadMessage(`Uploaded ${notes} notes and ${folders} folders to your account.`);
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    if (existingAccountEmail && !pendingEmail) {
      return (
        <p className="text-sm text-muted-foreground leading-relaxed">
          This email is already registered. Sign in from the account section after restarting the app.
        </p>
      );
    }
    if (pendingEmail) {
      return (
        <AuthPendingEmailPanel
          compact
          email={pendingEmail}
          resending={resending}
          resendMessage={resendMessage}
          onResend={() => {
            setResending(true);
            setResendMessage(null);
            void resendSignupConfirmation(pendingEmail)
              .then(() => setResendMessage('Another confirmation email was sent.'))
              .catch((err) =>
                setResendMessage(err instanceof Error ? err.message : 'Could not resend email'),
              )
              .finally(() => setResending(false));
          }}
          onBackToSignIn={() => {
            acknowledgeEmailPending();
            setMode('sign-in');
            setEmail(pendingEmail);
            clearAuthError();
          }}
        />
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        {(authFeedback.kind === 'signing_in' || authFeedback.kind === 'creating_account') && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            {authFeedback.kind === 'signing_in' ? 'Signing in…' : 'Creating account…'}
          </p>
        )}
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`cursor-pointer ${mode === 'sign-in' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
          >
            Sign in
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            className={`cursor-pointer ${mode === 'sign-up' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
          >
            Create account
          </button>
        </div>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
        {authError && <p className="text-xs text-destructive">{authError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium cursor-pointer disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Status</span>
        <span className={syncStatus === 'error' ? 'text-destructive' : 'text-foreground'}>
          {syncLabel(syncStatus, syncError)}
        </span>
      </div>
      {syncError && syncStatus === 'error' && (
        <p className="text-xs text-destructive leading-relaxed">{syncError}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pulling || syncStatus === 'syncing'}
          onClick={() => void handlePull()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:bg-muted cursor-pointer disabled:opacity-60"
        >
          {pulling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync now
        </button>
        {isElectron && !cloudOnlyDesktop && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => void handleUpload()}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload from this computer
          </button>
        )}
      </div>

      {uploadMessage && (
        <p
          className={`text-xs ${
            uploadMessage.includes('failed') ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {uploadMessage}
        </p>
      )}
    </div>
  );
}
