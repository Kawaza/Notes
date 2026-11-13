import { useEffect, useRef, useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { profileFullName, profileInitials } from '../types/profile';
import { useStore } from '../store/useStore';

export function SidebarAccountChip() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const rehydrate = useStore((s) => s.rehydrate);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  if (!user?.email) return null;

  const displayName = profile
    ? profileFullName(profile)
    : '';
  const initial = profile
    ? profileInitials(profile)
    : user.email.trim().charAt(0).toUpperCase() || '?';
  const chipLabel = displayName || user.email;
  const shortLabel =
    chipLabel.length > 18 ? `${chipLabel.slice(0, 16)}…` : chipLabel;

  const openAccount = () => {
    setMenuOpen(false);
    setSettingsOpen(true, 'account');
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    await signOut();
    await rehydrate(null);
  };

  return (
    <div ref={rootRef} className="relative">
      {menuOpen && (
        <div className="absolute bottom-full left-0 right-0 z-50 pb-1">
          <div className="rounded-lg border border-border bg-background shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={openAccount}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted cursor-pointer border-b border-border"
            >
              <User size={14} className="text-muted-foreground" />
              Account
            </button>
            <button
              type="button"
              onClick={(e) => void handleSignOut(e)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-muted cursor-pointer"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors cursor-pointer ${
          menuOpen ? 'bg-muted' : 'hover:bg-muted/80'
        }`}
        title={displayName ? `${displayName} · ${user.email}` : user.email}
        aria-expanded={menuOpen}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium truncate text-foreground">{shortLabel}</span>
          <span className="block text-[10px] text-muted-foreground">Account</span>
        </span>
      </button>
    </div>
  );
}
