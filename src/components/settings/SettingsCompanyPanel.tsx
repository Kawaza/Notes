import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArchiveRestore, Building2, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useCompanyStore } from '../../store/companyStore';
import { useAuthStore } from '../../store/authStore';
import { CreateCompanyDialog } from '../company/CreateCompanyDialog';
import { CompanyInviteDialog } from '../company/CompanyInviteDialog';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { SettingsPanelShell } from './SettingsPanelShell';
import { isSupabaseConfigured } from '../../sync/supabaseClient';
import { normalizeInviteCodeInput } from '../../utils/inviteCode';
import { ConfirmDialog } from '../ConfirmDialog';

export function SettingsCompanyPanel() {
  const createCompanyWorkspace = useCompanyStore((s) => s.createCompanyWorkspace);
  const joinWithInviteCode = useCompanyStore((s) => s.joinWithInviteCode);
  const leaveWorkspace = useCompanyStore((s) => s.leaveWorkspace);
  const deleteWorkspace = useCompanyStore((s) => s.deleteWorkspace);
  const restoreWorkspace = useCompanyStore((s) => s.restoreWorkspace);
  const purgeDeletedWorkspace = useCompanyStore((s) => s.purgeDeletedWorkspace);
  const refreshCompanies = useCompanyStore((s) => s.refreshCompanies);
  const companies = useCompanyStore((s) => s.companies);
  const archivedCompanies = useCompanyStore((s) => s.archivedCompanies);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ name: string; code: string } | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; name: string } | null>(null);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <SettingsPanelShell>
        <p className="text-sm text-muted-foreground">Workspaces require cloud sync.</p>
      </SettingsPanelShell>
    );
  }

  const submitJoin = async () => {
    const normalized = normalizeInviteCodeInput(joinCode);
    if (normalized.length < 6) {
      setJoinError('Enter the full invite code');
      return;
    }
    setJoinBusy(true);
    setJoinError(null);
    try {
      await joinWithInviteCode(normalized);
      setJoinCode('');
      void refreshCompanies();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join');
    } finally {
      setJoinBusy(false);
    }
  };

  const confirmLeave = async () => {
    if (!leaveTarget) return;
    setLeaveBusy(true);
    setLeaveError(null);
    try {
      await leaveWorkspace(leaveTarget.id);
      setLeaveTarget(null);
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : 'Could not leave workspace');
    } finally {
      setLeaveBusy(false);
    }
  };

  const confirmPurge = async () => {
    if (!purgeTarget) return;
    setPurgeBusy(true);
    try {
      await purgeDeletedWorkspace(purgeTarget.id);
      setPurgeTarget(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete workspace');
    } finally {
      setPurgeBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteWorkspace(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete workspace');
    } finally {
      setDeleteBusy(false);
    }
  };

  const dialogs =
    typeof document !== 'undefined' ? (
      <>
        {createOpen &&
          createPortal(
            <CreateCompanyDialog
              onClose={() => setCreateOpen(false)}
              onCreate={async (name) => {
                const company = await createCompanyWorkspace(name);
                setCreateOpen(false);
                setInviteInfo({ name: company.name, code: company.inviteCode });
              }}
            />,
            document.body,
          )}
        {inviteInfo &&
          createPortal(
            <CompanyInviteDialog
              companyName={inviteInfo.name}
              inviteCode={inviteInfo.code}
              onClose={() => {
                setInviteInfo(null);
                void refreshCompanies();
              }}
            />,
            document.body,
          )}
      </>
    ) : null;

  return (
    <SettingsPanelShell>
      <SettingsSectionHeader
        icon={<Building2 size={20} className="text-muted-foreground" />}
        title="Workspaces"
        description="Each workspace is its own section in the sidebar (e.g. CME, Marketing). Use + on that section to add shared folders. New accounts start with no workspace until you create or join one."
      />

      <div className="grid sm:grid-cols-2 gap-4 items-stretch">
        <div className="rounded-xl border border-border bg-background p-5 flex flex-col h-[188px]">
          <p className="text-sm font-semibold text-foreground">Create workspace</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2 flex-1">
            Adds a new sidebar section. You become owner and get an invite code for teammates.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 cursor-pointer"
          >
            Create workspace
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background p-5 flex flex-col h-[188px]">
          <p className="text-sm font-semibold text-foreground">Join with invite code</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            You can belong to multiple workspaces at once.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                if (joinError) setJoinError(null);
              }}
              placeholder="ABCD-1234"
              className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
            <button
              type="button"
              disabled={joinBusy}
              onClick={() => void submitJoin()}
              className="shrink-0 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {joinBusy && <Loader2 size={14} className="animate-spin" />}
              Join
            </button>
          </div>
          <p className="text-xs text-destructive mt-2 h-4 leading-4">{joinError ?? ''}</p>
        </div>
      </div>

      {sortedCompanies.length > 0 ? (
        <div className="mt-8">
          <p className="text-sm font-medium mb-3">Your workspaces</p>
          <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {sortedCompanies.map((c) => {
              const isOwner = userId === c.ownerId;
              const folderNames = (foldersByCompany[c.id] ?? [])
                .filter((f) => !f.archived)
                .map((f) => f.name);
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3 bg-background">
                  <Building2 size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOwner ? 'Owner' : 'Member'} · Invite {c.inviteCode}
                      {folderNames.length > 0 ? ` · Folders: ${folderNames.join(', ')}` : ''}
                    </p>
                  </div>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                      className="flex items-center gap-1.5 text-xs font-medium text-destructive border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 px-2.5 py-1 rounded-md cursor-pointer shrink-0"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLeaveTarget({ id: c.id, name: c.name })}
                      className="flex items-center gap-1.5 text-xs text-foreground border border-border px-2.5 py-1 rounded-md hover:bg-muted cursor-pointer shrink-0"
                    >
                      <LogOut size={14} />
                      Leave
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          No workspaces yet. Create one or join with an invite code — nothing appears in the sidebar until you do.
        </p>
      )}

      {archivedCompanies.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-medium mb-1">Archived workspaces</p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Deleted workspaces are kept here so you can restore them. Permanent delete removes all shared data.
          </p>
          <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {archivedCompanies.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 bg-background">
                <Building2 size={16} className="text-muted-foreground shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Deleted {c.deletedAt ? new Date(c.deletedAt).toLocaleDateString() : 'recently'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={restoreBusyId === c.id}
                  onClick={async () => {
                    setRestoreBusyId(c.id);
                    try {
                      await restoreWorkspace(c.id);
                    } catch (err) {
                      window.alert(err instanceof Error ? err.message : 'Could not restore');
                    } finally {
                      setRestoreBusyId(null);
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-primary border border-primary/30 px-2.5 py-1 rounded-md hover:bg-primary/10 cursor-pointer shrink-0"
                >
                  <ArchiveRestore size={14} />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => setPurgeTarget({ id: c.id, name: c.name })}
                  className="flex items-center gap-1 text-xs font-medium text-destructive border border-destructive/40 px-2.5 py-1 rounded-md hover:bg-destructive/10 cursor-pointer shrink-0"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!leaveTarget}
        title="Leave workspace?"
        message={
          leaveTarget
            ? `${leaveError ? `${leaveError}\n\n` : ''}You will lose access to "${leaveTarget.name}" until you join again with the invite code.`
            : ''
        }
        confirmLabel={leaveBusy ? 'Leaving…' : 'Leave'}
        danger
        onConfirm={() => void confirmLeave()}
        onClose={() => {
          if (leaveBusy) return;
          setLeaveError(null);
          setLeaveTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete workspace?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be archived. You can restore it from Archived workspaces below, or delete it permanently later.`
            : ''
        }
        confirmLabel={deleteBusy ? 'Archiving…' : 'Archive workspace'}
        danger
        onConfirm={() => void confirmDelete()}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!purgeTarget}
        title="Delete permanently?"
        message={
          purgeTarget
            ? `"${purgeTarget.name}" and all folders, tasks, and notes will be removed forever. This cannot be undone.`
            : ''
        }
        confirmLabel={purgeBusy ? 'Deleting…' : 'Delete forever'}
        danger
        onConfirm={() => void confirmPurge()}
        onClose={() => !purgeBusy && setPurgeTarget(null)}
      />

      {dialogs}
    </SettingsPanelShell>
  );
}

