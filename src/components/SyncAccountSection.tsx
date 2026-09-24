import { useState } from 'react';
import { Cloud, Loader2, LogOut, RefreshCw, Upload } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../store/useStore';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import type { SyncStatus } from '../sync/types';

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
  const signOut = useAuthStore((s) => s.signOut);
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);
  const rehydrate = useStore((s) => s.rehydrate);
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

  const isElectron = Boolean(window.electronAPI?.isElectron);

  if (!isSupabaseConfigured()) {
    return (
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Cloud size={14} /> Cloud sync
        </h3>
        <p className="text-sm text-muted-foreground">
          Supabase is not configured in this build.
        </p>
      </section>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    await rehydrate(null);
    setUploadMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearAuthError();
    setUploadMessage(null);
    try {
      if (mode === 'sign-in') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch {
      // error in store
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

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Cloud size={14} /> Cloud sync
      </h3>

      {user ? (
        <div className="space-y-3">
          <p className="text-sm">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Status: {syncLabel(syncStatus, syncError)}
          </p>
          {syncError && syncStatus === 'error' && (
            <p className="text-xs text-destructive leading-relaxed">{syncError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pulling || syncStatus === 'syncing'}
              onClick={() => void handlePull()}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer disabled:opacity-60"
            >
              {pulling ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Sync now
            </button>
            {isElectron && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUpload()}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Upload from this computer
              </button>
            )}
          </div>
          {isElectron && (
            <p className="text-xs text-muted-foreground">
              Upload merges this computer&apos;s notes with your cloud account.
            </p>
          )}

          {uploadMessage && (
            <p className={`text-xs ${uploadMessage.includes('failed') || uploadMessage.includes('Sign in') ? 'text-destructive' : 'text-muted-foreground'}`}>
              {uploadMessage}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in with your account (e.g. aaronbenndesigns@gmail.com) to sync with the web app.
          </p>
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
      )}
    </section>
  );
}
