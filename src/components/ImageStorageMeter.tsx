import { useMemo } from 'react';
import { ImageIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  MAX_SINGLE_IMAGE_BYTES,
  buildPrivateImageStorageUsage,
  imageBytesInNotes,
} from '../utils/imageStorageQuota';
import { formatSyncPayloadSize } from '../sync/syncUtils';

export function ImageStorageMeter() {
  const notes = useStore((s) => s.notes);

  const usage = useMemo(() => {
    return buildPrivateImageStorageUsage(imageBytesInNotes(notes));
  }, [notes]);

  const barTone =
    usage.percent >= 95 ? 'bg-destructive' : usage.percent >= 80 ? 'bg-amber-500' : 'bg-primary';

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ImageIcon size={18} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">Photo storage (private notes)</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each image can be up to {formatSyncPayloadSize(MAX_SINGLE_IMAGE_BYTES)}. Personal notes
            and folders share a {formatSyncPayloadSize(usage.limitBytes)} total image budget on your
            account. Workspace images only use the per-image limit.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatSyncPayloadSize(usage.usedBytes)} used</span>
          <span>{formatSyncPayloadSize(usage.limitBytes)} limit</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barTone}`}
            style={{ width: `${Math.max(2, usage.percent)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {usage.percent >= 95
            ? 'Almost full — remove images from private notes before adding more.'
            : usage.percent >= 80
              ? 'Getting full — consider smaller screenshots.'
              : `${formatSyncPayloadSize(usage.remainingBytes)} remaining in private notes.`}
        </p>
      </div>
    </div>
  );
}
