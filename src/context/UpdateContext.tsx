import { createContext, useContext, type ReactNode } from 'react';
import { useAppUpdater } from '../hooks/useAppUpdater';
import type { UpdateUiState } from '../hooks/useAppUpdater';

type UpdateContextValue = {
  state: UpdateUiState;
  bannerState: UpdateUiState;
  isElectron: boolean;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  installUpdate: () => void | Promise<void>;
  dismissBanner: () => void;
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const value = useAppUpdater();
  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdate() {
  const ctx = useContext(UpdateContext);
  if (!ctx) {
    throw new Error('useUpdate must be used within UpdateProvider');
  }
  return ctx;
}
