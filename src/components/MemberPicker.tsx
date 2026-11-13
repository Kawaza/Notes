import { useEffect, useRef, useState } from 'react';
import { ChevronDown, User } from 'lucide-react';
import type { CompanyMember } from '../types/company';
import type { UserProfile } from '../types/profile';
import { memberDisplayName } from '../utils/memberDisplayName';

interface MemberPickerProps {
  value: string | null;
  members: CompanyMember[];
  profilesByUserId: Record<string, UserProfile>;
  currentUserId: string | null;
  currentUserProfile?: UserProfile | null;
  onChange: (userId: string | null) => void;
  allowUnassigned?: boolean;
  placeholder?: string;
  className?: string;
  menuPlacement?: 'above' | 'below';
  showAvatar?: boolean;
  compactPill?: boolean;
  disabled?: boolean;
}

function memberInitials(label: string): string {
  const clean = label.replace(/\s*\(you\)\s*$/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function MemberPicker({
  value,
  members,
  profilesByUserId,
  currentUserId,
  currentUserProfile,
  onChange,
  allowUnassigned = true,
  placeholder = 'Assign',
  className = '',
  menuPlacement = 'above',
  showAvatar = false,
  compactPill = false,
  disabled = false,
}: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const label = value
    ? memberDisplayName(value, profilesByUserId, members, currentUserId, currentUserProfile)
    : placeholder;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={
          compactPill
            ? 'inline-flex items-center gap-1.5 min-w-0 h-full w-full text-xs text-foreground transition-colors cursor-pointer hover:opacity-90'
            : showAvatar
              ? 'inline-flex items-center gap-2 max-w-[220px] px-2 py-1 text-xs text-foreground transition-colors cursor-pointer'
              : 'inline-flex items-center gap-1.5 max-w-[200px] rounded-full px-2.5 py-0.5 text-xs bg-muted/80 hover:bg-muted text-foreground transition-colors cursor-pointer'
        }
      >
        {showAvatar ? (
          <span
            className={`flex shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background ${
              compactPill ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'
            }`}
          >
            {memberInitials(label)}
          </span>
        ) : (
          <User size={12} className="shrink-0 opacity-70" />
        )}
        <span className="truncate min-w-0">{label}</span>
        <ChevronDown size={11} className="shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          className={`absolute left-0 z-50 min-w-[200px] max-w-[280px] py-1 rounded-lg border border-border bg-background shadow-lg ${
            menuPlacement === 'below' ? 'top-full mt-1' : 'bottom-full mb-1'
          }`}
        >
          {allowUnassigned && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer ${
                !value ? 'text-primary font-medium' : 'text-foreground'
              }`}
            >
              Unassigned
            </button>
          )}
          {members.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => {
                onChange(m.userId);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted truncate cursor-pointer ${
                value === m.userId ? 'text-primary font-medium' : 'text-foreground'
              }`}
            >
              {memberDisplayName(
                m.userId,
                profilesByUserId,
                members,
                currentUserId,
                currentUserProfile,
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
