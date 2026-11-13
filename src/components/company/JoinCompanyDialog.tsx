import { useState } from 'react';
import { X } from 'lucide-react';
import { normalizeInviteCodeInput } from '../../utils/inviteCode';

export function JoinCompanyDialog({
  onClose,
  onJoin,
}: {
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalized = normalizeInviteCodeInput(code);
    if (normalized.length < 6) {
      setError('Enter the full invite code');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onJoin(normalized);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Join company folder</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Enter the invite code from your team. You will see shared folders and tasks they create.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono tracking-wider outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer disabled:opacity-60"
        >
          {busy ? 'Joining…' : 'Join'}
        </button>
      </div>
    </div>
  );
}
