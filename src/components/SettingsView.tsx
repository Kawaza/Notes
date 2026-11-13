import { ArrowLeft, Palette, Cloud, Database, Building2, Download, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { SettingsTab } from '../types';
import type { UpdateUiState } from '../hooks/useAppUpdater';
import type { SyncStatus } from '../sync/types';
import { SettingsAppearancePanel } from './settings/SettingsAppearancePanel';
import { SettingsSecurityPanel } from './settings/SettingsSecurityPanel';
import { SettingsCloudSyncPanel } from './settings/SettingsCloudSyncPanel';
import { SettingsBackupPanel } from './settings/SettingsBackupPanel';
import { SettingsAccountPanel } from './settings/SettingsAccountPanel';
import { SettingsCompanyPanel } from './settings/SettingsCompanyPanel';
import { SettingsUpdatesPanel } from './settings/SettingsUpdatesPanel';

export type SettingsViewProps = {
  updateState: UpdateUiState;
  isElectron: boolean;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  installUpdate: () => void | Promise<void>;
};

function syncStatusLabel(status: SyncStatus, error: string | null): { text: string; ok: boolean } {
  if (status === 'synced') return { text: 'Synced', ok: true };
  if (status === 'syncing') return { text: 'Syncing…', ok: true };
  if (status === 'error') return { text: error ?? 'Sync error', ok: false };
  return { text: 'Offline', ok: false };
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-muted/80'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</span>
      <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">{label}</span>
    </button>
  );
}

export function SettingsView({
  updateState,
  isElectron,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
}: SettingsViewProps) {
  const setViewMode = useStore((s) => s.setViewMode);
  const settingsTab = useStore((s) => s.settingsTab);
  const setSettingsTab = useStore((s) => s.setSettingsTab);
  const syncStatus = useStore((s) => s.syncStatus);
  const syncError = useStore((s) => s.syncError);

  const status = syncStatusLabel(syncStatus, syncError);

  const go = (tab: SettingsTab) => setSettingsTab(tab);

  const renderPanel = () => {
    switch (settingsTab) {
      case 'appearance':
        return <SettingsAppearancePanel />;
      case 'security':
        return <SettingsSecurityPanel />;
      case 'cloud-sync':
        return <SettingsCloudSyncPanel />;
      case 'backup':
        return <SettingsBackupPanel />;
      case 'account':
        return <SettingsAccountPanel onChangePassword={() => go('security')} />;
      case 'company':
        return <SettingsCompanyPanel />;
      case 'updates':
        return (
          <SettingsUpdatesPanel
            state={updateState}
            isElectron={isElectron}
            onCheck={checkForUpdates}
            onDownload={downloadUpdate}
            onInstall={installUpdate}
          />
        );
      default:
        return <SettingsAppearancePanel />;
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background overflow-hidden">
      <header className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => setViewMode('notes')}
          className="p-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold flex-1">Settings</h1>
        <span
          className={`flex items-center gap-1.5 text-xs ${
            status.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status.ok ? 'bg-emerald-500' : 'bg-muted-foreground'
            }`}
          />
          {status.text}
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        <nav className="w-[12.75rem] md:w-60 shrink-0 border-r border-border overflow-y-auto py-4 px-2 hidden sm:block">
          <NavGroup title="Preferences">
            <NavItem
              active={settingsTab === 'appearance'}
              onClick={() => go('appearance')}
              icon={<Palette size={16} />}
              label="Appearance"
            />
          </NavGroup>
          <NavGroup title="Data">
            <NavItem
              active={settingsTab === 'cloud-sync'}
              onClick={() => go('cloud-sync')}
              icon={<Cloud size={16} />}
              label="Cloud sync"
            />
            <NavItem
              active={settingsTab === 'backup'}
              onClick={() => go('backup')}
              icon={<Database size={16} />}
              label="Backup & import"
            />
          </NavGroup>
          <NavGroup title="Account">
            <NavItem
              active={settingsTab === 'account'}
              onClick={() => go('account')}
              icon={<User size={16} />}
              label="Account"
            />
            <NavItem
              active={settingsTab === 'company'}
              onClick={() => go('company')}
              icon={<Building2 size={16} />}
              label="Workspaces"
            />
            {isElectron && (
              <NavItem
                active={settingsTab === 'updates'}
                onClick={() => go('updates')}
                icon={<Download size={16} />}
                label="Updates"
              />
            )}
          </NavGroup>
        </nav>

        <main className="flex-1 overflow-y-auto bg-muted/25 [scrollbar-gutter:stable]">
          <div className="px-5 py-6 md:px-12 md:py-10 min-h-full max-w-4xl mx-auto w-full">
          <div className="sm:hidden mb-4">
            <select
              value={settingsTab}
              onChange={(e) => go(e.target.value as SettingsTab)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="appearance">Appearance</option>
              <option value="cloud-sync">Cloud sync</option>
              <option value="backup">Backup & import</option>
              <option value="account">Account</option>
              <option value="company">Workspaces</option>
              {isElectron && <option value="updates">Updates</option>}
            </select>
          </div>
          {renderPanel()}
          </div>
        </main>
      </div>
    </div>
  );
}
