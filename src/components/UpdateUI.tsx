import { Download, RefreshCw, Sparkles, X } from 'lucide-react';
import type { UpdateUiState } from '../hooks/useAppUpdater';

type UpdateBannerProps = {
  state: UpdateUiState;
  onDownload: () => void;
  onInstall: () => void;
  onDismiss: () => void;
  onOpenSettings: () => void;
};

export function UpdateBanner({
  state,
  onDownload,
  onInstall,
  onDismiss,
  onOpenSettings,
}: UpdateBannerProps) {
  if (state.status === 'idle' || state.status === 'checking' || state.status === 'current' || state.status === 'dev-mode') {
    return null;
  }

  if (state.status === 'error') {
    return (
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-destructive/10 border-b border-destructive/20 text-sm">
        <span className="flex-1 text-destructive">Update check failed: {state.message}</span>
        <button onClick={onDismiss} className="p-1 rounded hover:bg-destructive/10 cursor-pointer">
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.status === 'available') {
    return (
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm">
        <Sparkles size={16} className="text-primary shrink-0" />
        <span className="flex-1">
          Notes <strong>{state.version}</strong> is available
          {state.currentVersion ? ` (you have ${state.currentVersion})` : ''}
        </span>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 cursor-pointer"
        >
          <Download size={13} /> Download
        </button>
        <button onClick={onDismiss} className="p-1 rounded hover:bg-primary/10 cursor-pointer text-muted-foreground">
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.status === 'downloading') {
    const percent = Math.round(state.percent);
    return (
      <div className="shrink-0 px-4 py-2.5 bg-muted/50 border-b border-border text-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-muted-foreground">Downloading update…</span>
          <span className="text-xs tabular-nums">{percent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm">
        <Sparkles size={16} className="text-primary shrink-0" />
        <span className="flex-1">
          Notes <strong>{state.version}</strong> is ready to install
        </span>
        <button
          onClick={onInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 cursor-pointer"
        >
          <RefreshCw size={13} /> Restart & update
        </button>
        <button onClick={onOpenSettings} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
          Later
        </button>
      </div>
    );
  }

  return null;
}

export function UpdateSettingsSection({
  state,
  appVersion,
  onCheck,
  onDownload,
  onInstall,
}: {
  state: UpdateUiState;
  appVersion: string | null;
  onCheck: () => void;
  onDownload: () => void;
  onInstall: () => void;
}) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Updates
      </h3>
      <p className="text-sm text-muted-foreground mb-3">Version {appVersion ?? '…'}</p>

      {state.status === 'available' && (
        <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
          <p className="mb-2">
            <strong>{state.version}</strong> is available
          </p>
          <button
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer"
          >
            <Download size={15} /> Download update
          </button>
        </div>
      )}

      {state.status === 'downloading' && (
        <div className="mb-3 p-3 rounded-lg border border-border bg-muted/30 text-sm">
          <div className="flex justify-between mb-2 text-muted-foreground">
            <span>Downloading…</span>
            <span className="tabular-nums">{Math.round(state.percent)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round(state.percent)}%` }}
            />
          </div>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
          <p className="mb-2">
            <strong>{state.version}</strong> downloaded — restart to install
          </p>
          <button
            onClick={onInstall}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer"
          >
            <RefreshCw size={15} /> Restart & update
          </button>
        </div>
      )}

      {state.status === 'current' && (
        <p className="text-xs text-muted-foreground mb-3">You&apos;re on the latest version.</p>
      )}

      {state.status === 'error' && (
        <p className="text-xs text-destructive mb-3">{state.message}</p>
      )}

      {state.status === 'checking' && (
        <p className="text-xs text-muted-foreground mb-3">Checking for updates…</p>
      )}

      <button
        onClick={onCheck}
        disabled={state.status === 'checking' || state.status === 'downloading'}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={15} className={state.status === 'checking' ? 'animate-spin' : ''} />
        Check for updates
      </button>
    </section>
  );
}
