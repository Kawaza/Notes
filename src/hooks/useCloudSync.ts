import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../store/useStore';
import { isSupabaseConfigured } from '../sync/supabaseClient';

/** Load notes and subscribe to cloud changes when the user signs in. */
export function useCloudSync() {
  const authLoading = useAuthStore((s) => s.authLoading);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const rehydrate = useStore((s) => s.rehydrate);
  const startCloudSync = useStore((s) => s.startCloudSync);
  const stopCloudSync = useStore((s) => s.stopCloudSync);

  useEffect(() => {
    if (authLoading) return;

    const isElectron = Boolean(window.electronAPI?.isElectron);
    const needsAuth = !isElectron && isSupabaseConfigured();
    if (needsAuth && !userId) return;

    let cancelled = false;
    void (async () => {
      await rehydrate(userId);
      if (cancelled) return;
      if (userId) startCloudSync(userId);
      else stopCloudSync();
    })();

    return () => {
      cancelled = true;
      stopCloudSync();
    };
  }, [authLoading, userId, rehydrate, startCloudSync, stopCloudSync]);
}
