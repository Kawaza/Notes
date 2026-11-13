import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

/** Listen for notes:// auth callbacks from the OS (desktop email confirmation). */
export function useAuthDeepLink() {
  const applyAuthDeepLink = useAuthStore((s) => s.applyAuthDeepLink);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onAuthCallbackUrl) return;
    return api.onAuthCallbackUrl((url) => {
      void applyAuthDeepLink(url);
    });
  }, [applyAuthDeepLink]);
}
