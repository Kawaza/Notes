import { useRef } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  exportAsJson,
  exportAsMarkdownZip,
  downloadBlob,
  parseImportedJson,
  importMarkdownFiles,
} from '../../utils/exportImport';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { SettingsPanelShell } from './SettingsPanelShell';

export function SettingsBackupPanel() {
  const importData = useStore((s) => s.importData);
  const createNoteFromImport = useStore((s) => s.createNoteFromImport);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);

  const getAppData = () => {
    const {
      folders, notes, folderLinks, folderSecrets, theme, colorPalette, selectedFolderId,
      selectedNoteId, viewMode, selectedTag, foldersSectionName,
    } = useStore.getState();
    return {
      folders, notes, folderLinks, folderSecrets, theme, colorPalette,
      selectedFolderId, selectedNoteId, viewMode, selectedTag, foldersSectionName,
    };
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

  return (
    <SettingsPanelShell>
      <SettingsSectionHeader
        icon={<Database size={20} className="text-muted-foreground" />}
        title="Backup & import"
        description="Move your notes in or out of Notes."
      />

      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Export
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void exportAsJson(getAppData()).then((b) => downloadBlob(b, `notes-backup-${new Date().toISOString().slice(0, 10)}.json`))}
              className="rounded-xl border border-border p-4 text-left hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Download size={18} className="text-muted-foreground mb-2" />
              <p className="text-sm font-medium">JSON</p>
              <p className="text-xs text-muted-foreground mt-1">Full backup, restorable</p>
            </button>
            <button
              type="button"
              onClick={() => void exportAsMarkdownZip(getAppData()).then((b) => downloadBlob(b, `notes-export-${new Date().toISOString().slice(0, 10)}.zip`))}
              className="rounded-xl border border-border p-4 text-left hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Download size={18} className="text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Markdown</p>
              <p className="text-xs text-muted-foreground mt-1">One .md file per note</p>
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Import
          </p>
          <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
            <Upload size={24} className="mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Import a JSON backup or Markdown files</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
              >
                JSON file
              </button>
              <button
                type="button"
                onClick={() => mdInputRef.current?.click()}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
              >
                Markdown files
              </button>
            </div>
          </div>
        </div>
      </div>

      <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
      <input
        ref={mdInputRef}
        type="file"
        accept=".md"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          if (!files?.length) return;
          const partials = await importMarkdownFiles(files);
          partials.forEach((p) => createNoteFromImport(p));
          e.target.value = '';
        }}
      />
    </SettingsPanelShell>
  );
}
