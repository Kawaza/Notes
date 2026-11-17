import type { MemberMentionSuggestion } from '../types/memberMention';

const shellClass =
  'min-w-[200px] max-w-sm max-h-52 overflow-y-auto py-1 rounded-lg border border-border bg-background shadow-lg';

export function MemberMentionMenu({
  top,
  left,
  options,
  onPick,
  placement = 'fixed',
  loading,
}: {
  top?: number;
  left?: number;
  options: MemberMentionSuggestion[];
  onPick: (member: MemberMentionSuggestion) => void;
  placement?: 'fixed' | 'inline';
  loading?: boolean;
}) {
  const positionClass = placement === 'inline' ? 'w-full z-[210]' : 'fixed z-[300]';

  return (
    <div
      className={`${positionClass} ${shellClass}`}
      style={placement === 'fixed' ? { top, left } : undefined}
      data-member-mention-menu
      onMouseDown={(e) => e.preventDefault()}
    >
      {loading ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Loading members…</p>
      ) : options.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No matching members</p>
      ) : (
        options.map((member) => (
          <button
            key={member.userId}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(member);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer truncate"
          >
            @{member.label}
          </button>
        ))
      )}
    </div>
  );
}