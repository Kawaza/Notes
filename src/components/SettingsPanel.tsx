import { useRef, useState, useEffect } from 'react';
import { Download, Upload, X, Palette, Sun, Moon, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { COLOR_PALETTES } from '../constants/palettes';
import {
  exportAsJson,
  exportAsMarkdownZip,
  downloadBlob,
  parseImportedJson,
  importMarkdownFiles,
} from '../utils/exportImport';
import type { ColorPalette } from '../types';
import { DEFAULT_FOLDER_ID } from '../types';

export function SettingsPanel() {
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const theme = useStore((s) => s.theme);
  const colorPalette = useStore((s) => s.colorPalette);
  const setTheme = useStore((s) => s.setTheme);
  const setColorPalette = useStore((s) => s.setColorPalette);
  const importData = useStore((s) => s.importData);
  const createNoteFromImport = useStore((s) => s.createNoteFromImport);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);
  const isElectron = !!window.electronAPI?.isElectron;
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.getAppVersion) return;
    window.electronAPI.getAppVersion().then(setAppVersion);
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onUpdateEvent) return;
    return window.electronAPI.onUpdateEvent((event) => {
      switch (event.type) {
        case 'checking':
          setUpdateStatus('Checking for updates…');
          break;
        case 'downloading':
          setUpdateStatus('Downloading update…');
          break;
        case 'progress':
          setUpdateStatus(`Downloading… ${Math.round(event.percent ?? 0)}%`);
          break;
        case 'downloaded':
          setUpdateStatus(`Update ${event.version} ready — restart to install.`);
          break;
        case 'not-available':
          setUpdateStatus('You have the latest version.');
          break;
        case 'error':
          setUpdateStatus('Could not check for updates.');
          break;
        default:
          break;
      }
    });
  }, [isElectron]);

  const handleCheckForUpdates = () => {
    window.electronAPI?.checkForUpdates?.();
  };

  if (!settingsOpen) return null;

  const getAppData = () => {
    const {
      folders, notes, folderLinks, folderSecrets, theme, colorPalette, selectedFolderId,
      selectedNoteId, viewMode, selectedTag,
    } = useStore.getState();
    return { folders, notes, folderLinks, folderSecrets, theme, colorPalette, selectedFolderId, selectedNoteId, viewMode, selectedTag };
  };

  const handleExportJson = async () => {
    const blob = await exportAsJson(getAppData());
    downloadBlob(blob, `notes-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleExportMd = async () => {
    const blob = await exportAsMarkdownZip(getAppData());
    downloadBlob(blob, `notes-export-${new Date().toISOString().slice(0, 10)}.zip`);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = parseImportedJson(text);
    if (data) {
      const merge = confirm('Merge with existing notes? Click Cancel to replace all data.');
      importData(data, merge);
    } else {
      alert('Invalid JSON file');
    }
    e.target.value = '';
  };

  const handleImportMd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const partials = await importMarkdownFiles(files);
    partials.forEach((p) => createNoteFromImport(p, DEFAULT_FOLDER_ID));
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-md hover:bg-muted cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Palette size={14} /> Appearance
            </h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  theme === 'light' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
              >
                <Sun size={16} /> Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  theme === 'dark' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
              >
                <Moon size={16} /> Dark
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setColorPalette(p.id as ColorPalette)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                    colorPalette === p.id
                      ? 'ring-2 ring-primary bg-accent'
                      : 'hover:bg-muted border border-border'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: p.preview }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Export
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer transition-colors"
              >
                <Download size={15} /> JSON Backup
              </button>
              <button
                onClick={handleExportMd}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer transition-colors"
              >
                <Download size={15} /> Markdown ZIP
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Import
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => jsonInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer transition-colors"
              >
                <Upload size={15} /> JSON
              </button>
              <button
                onClick={() => mdInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer transition-colors"
              >
                <Upload size={15} /> Markdown
              </button>
            </div>
            <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            <input ref={mdInputRef} type="file" accept=".md" multiple className="hidden" onChange={handleImportMd} />
          </section>

          {isElectron && (
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Updates
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Version {appVersion ?? '…'}
              </p>
              <button
                onClick={handleCheckForUpdates}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer transition-colors"
              >
                <RefreshCw size={15} /> Check for updates
              </button>
              {updateStatus && (
                <p className="text-xs text-muted-foreground mt-2">{updateStatus}</p>
              )}
            </section>
          )}

          <section className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
            <p><kbd className="px-1 py-0.5 rounded bg-muted">Ctrl+K</kbd> Search</p>
            <p><kbd className="px-1 py-0.5 rounded bg-muted">Ctrl+N</kbd> New note</p>
            <p><kbd className="px-1 py-0.5 rounded bg-muted">Ctrl+Shift+D</kbd> Toggle theme</p>
          </section>
        </div>
      </div>
    </div>
  );
}
