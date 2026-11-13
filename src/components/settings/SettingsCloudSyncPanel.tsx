import { Cloud } from 'lucide-react';
import { SyncAccountSection } from '../SyncAccountSection';
import { ImageStorageMeter } from '../ImageStorageMeter';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { SettingsPanelShell } from './SettingsPanelShell';

export function SettingsCloudSyncPanel() {
  return (
    <SettingsPanelShell>
      <SettingsSectionHeader
        icon={<Cloud size={20} className="text-muted-foreground" />}
        title="Cloud sync"
        description="Keep your notes encrypted and up to date across devices."
      />
      <div className="space-y-4">
        <ImageStorageMeter />
        <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <SyncAccountSection />
        </div>
      </div>
    </SettingsPanelShell>
  );
}
