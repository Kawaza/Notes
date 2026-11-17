import type { MemberMentionSuggestion } from '../types/memberMention';

export function MemberMentionMenu({
  top,
  left,
  options,
  onPick,
}: {
  top: number;
  left: number;
  options: MemberMentionSuggestion[];
  onPick: (member: MemberMentionSuggestion) => void;
}) {
  return (
    <div
      className="fixed z-[300] min-w-[200px] max-w-sm max-h-52 overflow-y-auto py-1 rounded-lg border border-border bg-background shadow-lg"
      style={{ top, left }}
      data-member-mention-menu
      onMouseDown={(e) => e.preventDefault()}
    >
      {options.length === 0 ? (
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