import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { COLOR_PALETTES } from '../../constants/palettes';
import type { ColorPalette, Theme } from '../../types';
import { useIsCoarsePointer } from '../../hooks/useOrientation';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { SettingsPanelShell } from './SettingsPanelShell';

type ThemeChoice = 'light' | 'dark' | 'system';
const THEME_CHOICE_KEY = 'notes-theme-choice';

function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function SettingsAppearancePanel() {
  const theme = useStore((s) => s.theme);
  const colorPalette = useStore((s) => s.colorPalette);
  const setTheme = useStore((s) => s.setTheme);
  const setColorPalette = useStore((s) => s.setColorPalette);
  const mobileLandscapeFocus = useStore((s) => s.mobileLandscapeFocus);
  const setMobileLandscapeFocus = useStore((s) => s.setMobileLandscapeFocus);
  const sidebarShowPersonalFolders = useStore((s) => s.sidebarShowPersonalFolders ?? true);
  const sidebarShowArchive = useStore((s) => s.sidebarShowArchive ?? true);
  const sidebarShowWorkspace = useStore((s) => s.sidebarShowWorkspace ?? true);
  const setSidebarShowPersonalFolders = useStore((s) => s.setSidebarShowPersonalFolders);
  const setSidebarShowArchive = useStore((s) => s.setSidebarShowArchive);
  const setSidebarShowWorkspace = useStore((s) => s.setSidebarShowWorkspace);
  const showMobile = useIsMobile() || useIsCoarsePointer();

  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() => {
    const saved = localStorage.getItem(THEME_CHOICE_KEY) as ThemeChoice | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'light';
  });

  const accentName =
    COLOR_PALETTES.find((p) => p.id === colorPalette)?.name ?? 'Indigo';

  useEffect(() => {
    if (themeChoice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setTheme(mq.matches ? 'dark' : 'light');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [themeChoice, setTheme]);

  const pickTheme = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    localStorage.setItem(THEME_CHOICE_KEY, choice);
    if (choice === 'system') {
      setTheme(systemTheme());
    } else {
      setTheme(choice);
    }
  };

  const activeChoice =
    themeChoice === 'system' ? 'system' : theme === 'dark' ? 'dark' : 'light';

  return (
    <SettingsPanelShell>
      <SettingsSectionHeader
        icon={<Sun size={20} className="text-muted-foreground" />}
        title="Appearance"
        description="Theme and accent color for this device."
      />

      <div className="space-y-10">
        <div>
          <p className="text-sm font-medium mb-4 text-foreground">Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'light' as const, label: 'Light', icon: Sun, preview: 'bg-zinc-100 border-zinc-200' },
                { id: 'dark' as const, label: 'Dark', icon: Moon, preview: 'bg-zinc-900 border-zinc-700' },
                {
                  id: 'system' as const,
                  label: 'System',
                  icon: Monitor,
                  preview: 'bg-gradient-to-br from-zinc-100 to-zinc-900 border-zinc-300',
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => pickTheme(opt.id)}
                className={`relative rounded-xl border-2 p-3 pb-3.5 text-center transition-all cursor-pointer ${
                  activeChoice === opt.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/30 bg-background'
                }`}
              >
                <div className={`h-16 rounded-lg mb-3 border ${opt.preview}`} />
                <span className="flex items-center justify-center gap-1.5 text-sm font-medium">
                  <opt.icon size={15} className="text-muted-foreground" />
                  {opt.label}
                </span>
                {activeChoice === opt.id && (
                  <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">Accent color</p>
            <p className="text-sm text-muted-foreground">{accentName}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {COLOR_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setColorPalette(p.id as ColorPalette)}
                title={p.name}
                className={`h-8 w-8 rounded-full cursor-pointer transition-all ${
                  colorPalette === p.id
                    ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105'
                    : 'hover:scale-105'
                }`}
                style={{ background: p.preview }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-3 text-foreground">Preview</p>
          <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-24 shrink-0 space-y-1.5">
                <div className="h-2 w-16 rounded bg-muted" />
                <div className="h-6 rounded-md bg-primary/15 border border-primary/20" />
                <div className="h-6 rounded-md bg-muted/60" />
                <div className="h-6 rounded-md bg-muted/60" />
              </div>
              <div className="flex-1 rounded-lg border border-border p-3 min-h-[88px]">
                <div className="h-2 w-20 rounded bg-primary/80 mb-2" />
                <div className="h-2 w-full rounded bg-muted" />
                <div className="h-2 w-[85%] rounded bg-muted mt-1.5" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-3 text-foreground">Sidebar</p>
          <p className="text-xs text-muted-foreground mb-3">
            Hide sections you do not use. Workspaces require cloud sync.
          </p>
          <div className="space-y-2 rounded-xl border border-border bg-background p-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
              <span>Personal folders</span>
              <input
                type="checkbox"
                checked={sidebarShowPersonalFolders}
                onChange={(e) => setSidebarShowPersonalFolders(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
              <span>Shared workspaces</span>
              <input
                type="checkbox"
                checked={sidebarShowWorkspace}
                onChange={(e) => setSidebarShowWorkspace(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
              <span>Archive</span>
              <input
                type="checkbox"
                checked={sidebarShowArchive}
                onChange={(e) => setSidebarShowArchive(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
            </label>
          </div>
        </div>

        {showMobile && (
          <div className="rounded-xl border border-border bg-background p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mobileLandscapeFocus}
                onChange={(e) => setMobileLandscapeFocus(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm leading-snug">
                Landscape focus mode
                <span className="block text-xs text-muted-foreground mt-1 font-normal">
                  When your phone is sideways, show only the open note.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>
    </SettingsPanelShell>
  );
}
