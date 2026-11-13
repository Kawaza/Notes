import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { profileFullName, profileInitials } from '../../types/profile';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { SettingsPanelShell } from './SettingsPanelShell';

export function SettingsAccountPanel({
  onChangePassword,
}: {
  onChangePassword: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const updateProfileNames = useAuthStore((s) => s.updateProfileNames);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile?.firstName ?? '');
    setLastName(profile?.lastName ?? '');
  }, [profile]);

  if (!user?.email) {
    return <p className="text-sm text-muted-foreground">Not signed in.</p>;
  }

  const displayName =
    profileFullName({
      firstName: profile?.firstName ?? firstName,
      lastName: profile?.lastName ?? lastName,
      displayName: profile?.displayName ?? null,
    }) || user.email;
  const initial = profile
    ? profileInitials(profile)
    : user.email.trim().charAt(0).toUpperCase();

  const saveNames = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateProfileNames(firstName, lastName);
      setSaveMessage('Saved.');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Could not save name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPanelShell>
      <SettingsSectionHeader
        icon={<span className="text-primary">{initial}</span>}
        title="Account"
        description="Your name and sign-in email."
      />

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-background p-4 flex items-center gap-4 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate mt-1 mb-1">{user.email}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Signed in
            </p>
          </div>
          <button
            type="button"
            onClick={onChangePassword}
            className="shrink-0 text-sm font-medium text-primary hover:underline cursor-pointer"
          >
            Change password
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Your name</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">
              First name
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Last name
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveNames()}
              className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save name'}
            </button>
            {saveMessage && <p className="text-xs text-muted-foreground">{saveMessage}</p>}
          </div>
        </div>
      </div>
    </SettingsPanelShell>
  );
}

