import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import type { UpdateUiState } from '../../hooks/useAppUpdater';
import { UpdateSettingsSection } from '../UpdateUI';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { SettingsPanelShell } from './SettingsPanelShell';

export function SettingsUpdatesPanel({
  state,
  isElectron,
  onCheck,
  onDownload,
  onInstall,
  onClearError,
}: {
  state: UpdateUiState;
  isElectron: boolean;
  onCheck: () => void;
  onDownload: () => void;
  onInstall: () => void | Promise<void>;
  onClearError?: () => void;
}) {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.getAppVersion) return;
    window.electronAPI.getAppVersion().then(setAppVersion);
  }, [isElectron]);

  if (!isElectron) {
    return <p className="text-sm text-muted-foreground">Updates are available in the desktop app.</p>;
  }

  return (
    <SettingsPanelShell>
      <SettingsSectionHeader
        icon={<Download size={20} className="text-muted-foreground" />}
        title="Updates"
        description="Keep Notes up to date on this computer."
      />
      <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <UpdateSettingsSection
          embedded
          state={state}
          appVersion={appVersion}
          onCheck={onCheck}
          onDownload={onDownload}
          onInstall={onInstall}
          onClearError={onClearError}
        />
      </div>
    </SettingsPanelShell>
  );
}
