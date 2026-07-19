import { useEffect, useRef, useState } from 'react';
import { KeyRound, X, Eye, EyeOff } from 'lucide-react';
import type { FolderLink, FolderSecret, FolderSecretType } from '../types';

const SECRET_TYPES: { id: FolderSecretType; label: string }[] = [
  { id: 'password', label: 'Password' },
  { id: 'api_key', label: 'API Key' },
  { id: 'ssh_key', label: 'SSH Key' },
  { id: 'token', label: 'Auth Token' },
  { id: 'other', label: 'Other' },
];

export interface SecretFormData {
  title: string;
  type: FolderSecretType;
  value: string;
  username?: string;
  linkId?: string;
  notes?: string;
}

interface SecretDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SecretFormData) => void;
  folderName?: string;
  links?: FolderLink[];
  initial?: Partial<SecretFormData>;
  mode?: 'create' | 'edit';
}

export function SecretDialog({
  open,
  onClose,
  onSave,
  folderName,
  links = [],
  initial,
  mode = 'create',
}: SecretDialogProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<FolderSecretType>('password');
  const [value, setValue] = useState('');
  const [username, setUsername] = useState('');
  const [linkId, setLinkId] = useState('');
  const [notes, setNotes] = useState('');
  const [showValue, setShowValue] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setType(initial?.type ?? 'password');
      setValue(initial?.value ?? '');
      setUsername(initial?.username ?? '');
      setLinkId(initial?.linkId ?? '');
      setNotes(initial?.notes ?? '');
      setShowValue(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isMultiline = type === 'ssh_key' || type === 'api_key';

  const handleSave = () => {
    if (!value.trim()) return;
    onSave({
      title,
      type,
      value,
      username: username || undefined,
      linkId: linkId || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <KeyRound size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {mode === 'edit' ? 'Edit Credential' : 'Add Credential'}
              </h2>
              {folderName && <p className="text-xs text-muted-foreground">{folderName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Label</label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Production API, Website login"
              className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FolderSecretType)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {SECRET_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {links.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Linked to (optional)
                </label>
                <select
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  <option value="">None</option>
                  {links.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(type === 'password') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Username (optional)
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="email or username"
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {type === 'ssh_key' ? 'Private Key' : type === 'api_key' ? 'API Key' : 'Secret Value'}
            </label>
            <div className="relative">
              {isMultiline ? (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={
                    type === 'ssh_key'
                      ? '-----BEGIN OPENSSH PRIVATE KEY-----'
                      : 'sk-... or your API key'
                  }
                  rows={5}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30 font-mono text-[13px] resize-y"
                />
              ) : (
                <input
                  type={showValue ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter secret value"
                  className="w-full px-3 py-2 pr-10 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30 font-mono text-[13px]"
                />
              )}
              {!isMultiline && (
                <button
                  type="button"
                  onClick={() => setShowValue((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Where this is used, rotation date, etc."
              className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {mode === 'edit' ? 'Save Changes' : 'Add Credential'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function getSecretTypeLabel(type: FolderSecretType): string {
  return SECRET_TYPES.find((t) => t.id === type)?.label ?? 'Secret';
}

export function secretCopyText(secret: FolderSecret): string {
  if (secret.type === 'password' && secret.username) {
    return `${secret.username}\n${secret.value}`;
  }
  return secret.value;
}
