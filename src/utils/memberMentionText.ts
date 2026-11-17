import type { MemberMentionSuggestion } from '../types/memberMention';

export type ActiveMemberMention = {
  query: string;
  replaceFrom: number;
};

/** Finds an in-progress @mention before the caret (same rules as the rich editor). */
export function findActiveMemberMention(text: string, caret: number): ActiveMemberMention | null {
  const lookback = Math.min(caret, 64);
  const slice = text.slice(caret - lookback, caret);
  let at = -1;
  for (let i = slice.length - 1; i >= 0; i--) {
    if (slice[i] !== '@') continue;
    const prev = i === 0 ? ' ' : slice[i - 1]!;
    if (/\s|[([{]/.test(prev)) {
      at = i;
      break;
    }
  }
  if (at === -1) return null;
  const query = slice.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { query: query.toLowerCase(), replaceFrom: caret - lookback + at };
}

export function filterMemberMentionOptions(
  members: MemberMentionSuggestion[],
  query: string,
  limit = 8,
): MemberMentionSuggestion[] {
  return members.filter((m) => !query || m.label.toLowerCase().includes(query)).slice(0, limit);
}

export function insertMemberMentionInText(
  text: string,
  caret: number,
  mention: ActiveMemberMention,
  member: MemberMentionSuggestion,
): { text: string; caret: number } {
  const before = text.slice(0, mention.replaceFrom);
  const after = text.slice(caret);
  const insert = `@${member.label} `;
  const next = before + insert + after;
  return { text: next, caret: before.length + insert.length };
}