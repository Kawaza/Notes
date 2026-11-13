import { useState } from 'react';
import { Copy, X } from 'lucide-react';

export function CompanyInviteDialog({
  companyName,
  inviteCode,
  onClose,
}: {
  companyName: string;
  inviteCode: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold">Company folder created</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Share this private code with {companyName} teammates (e.g. Allison). They use{' '}
              <strong>Add Company Folder → Enter code</strong>.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-3 font-mono text-lg tracking-widest justify-center">
          {inviteCode}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer"
        >
          <Copy size={16} />
          {copied ? 'Copied' : 'Copy invite code'}
        </button>
      </div>
    </div>
  );
}
