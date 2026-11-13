import { useState } from 'react';
import { X } from 'lucide-react';

export function CreateCompanyDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError('Enter a company or team name');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not create company folder';
      setError(
        raw.includes('patch-company-create')
          ? raw
          : raw.includes('row-level security')
            ? `${raw} Run supabase/patch-company-create.sql in Supabase → SQL editor, then retry.`
            : raw,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Create workspace</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          This adds a new section in the sidebar with that name. Use + on it to add shared folders. You will get an
          invite code for teammates.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. IRI 8 Investigation"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create & get invite code'}
        </button>
      </div>
    </div>
  );
}
