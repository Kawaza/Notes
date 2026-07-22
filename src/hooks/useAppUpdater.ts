import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

export type UpdateUiState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; currentVersion?: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready'; version: string }
  | { status: 'current' }
  | { status: 'error'; message: string }
  | { status: 'dev-mode' };

export function useAppUpdater() {
  const [state, setState] = useState<UpdateUiState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const isElectron = !!window.electronAPI?.isElectron;

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onUpdateEvent) return;

    void window.electronAPI.notifyUpdaterReady?.();

    return window.electronAPI.onUpdateEvent((event) => {
      switch (event.type) {
        case 'checking':
          setState({ status: 'checking' });
          break;
        case 'available':
          setDismissed(false);
          setState({
            status: 'available',
            version: event.version ?? '',
            currentVersion: event.currentVersion,
          });
          break;
        case 'downloading':
          setState({ status: 'downloading', percent: 0 });
          break;
        case 'progress':
          setState({ status: 'downloading', percent: event.percent ?? 0 });
          break;
        case 'downloaded':
          setDismissed(false);
          setState({ status: 'ready', version: event.version ?? '' });
          break;
        case 'not-available':
          setState({ status: 'current' });
          break;
        case 'error':
          setState({ status: 'error', message: event.message ?? 'Update failed' });
          break;
        case 'dev-mode':
          setState({ status: 'dev-mode' });
          break;
        default:
          break;
      }
    });
  }, [isElectron]);

  const checkForUpdates = useCallback(() => {
    setState({ status: 'checking' });
    window.electronAPI?.checkForUpdates?.();
  }, []);

  const downloadUpdate = useCallback(() => {
    window.electronAPI?.downloadUpdate?.();
  }, []);

  const installUpdate = useCallback(async () => {
    await useStore.getState().flushPersist();
    window.electronAPI?.installUpdate?.();
  }, []);

  const dismissBanner = useCallback(() => setDismissed(true), []);

  const bannerState = dismissed && (state.status === 'available' || state.status === 'ready')
    ? { status: 'idle' as const }
    : state;

  return {
    state,
    bannerState,
    isElectron,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissBanner,
  };
}
