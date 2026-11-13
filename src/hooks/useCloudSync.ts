import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../store/useStore';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import { useCompanyStore } from '../store/companyStore';
import { useWorkspaceCompanyRealtime } from './useWorkspaceCompanyRealtime';
import { parseWorkspaceFolderSelectionId } from '../types/company';

/** Load notes and subscribe to cloud changes when the user signs in. */
export function useCloudSync() {
  const authLoading = useAuthStore((s) => s.authLoading);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  useWorkspaceCompanyRealtime(Boolean(userId) && !authLoading);
  const rehydrate = useStore((s) => s.rehydrate);
  const startCloudSync = useStore((s) => s.startCloudSync);
  const stopCloudSync = useStore((s) => s.stopCloudSync);
  const pullRemoteSync = useStore((s) => s.pullRemoteSync);

  useEffect(() => {
    if (authLoading) return;

    if (isSupabaseConfigured() && !userId) return;

    let cancelled = false;
    void (async () => {
      await rehydrate(userId);
      if (cancelled) return;
      if (userId) {
        startCloudSync(userId);
        void useCompanyStore.getState().refreshCompanies();
      } else {
        stopCloudSync();
        useCompanyStore.getState().clear();
      }
    })();

    return () => {
      cancelled = true;
      stopCloudSync();
    };
  }, [authLoading, userId, rehydrate, startCloudSync, stopCloudSync]);

  const lastFocusPull = useRef(0);

  useEffect(() => {
    if (authLoading || !userId) return;

    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusPull.current < 120_000) return;
      lastFocusPull.current = now;
      void pullRemoteSync(userId);
      const ws = parseWorkspaceFolderSelectionId(useStore.getState().selectedFolderId);
      if (ws) void useCompanyStore.getState().loadFolderContent(ws.folderId);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authLoading, userId, pullRemoteSync]);
}
