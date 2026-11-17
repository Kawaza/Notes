import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import type { MemberMentionSuggestion } from '../types/memberMention';
import { MemberMentionMenu } from './MemberMentionMenu';
import {
  filterMemberMentionOptions,
  findActiveMemberMention,
  insertMemberMentionInText,
  type ActiveMemberMention,
} from '../utils/memberMentionText';
import { getTextareaCaretClientRect } from '../utils/textareaCaretPosition';

type MemberMentionTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange'
> & {
  value: string;
  onChange: (value: string) => void;
  members: MemberMentionSuggestion[];
  /** Dropdown anchored below the field (for modals). */
  inlineMenu?: boolean;
  membersLoading?: boolean;
};

export function MemberMentionTextarea({
  value,
  onChange,
  members,
  inlineMenu = false,
  membersLoading = false,
  className,
  onKeyDown,
  onSelect,
  onClick,
  ...rest
}: MemberMentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState<ActiveMemberMention | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const updateMentionMenu = useCallback(
    (text: string, pos: number, el: HTMLTextAreaElement | null) => {
      if (!el) {
        setActive(null);
        setMenuPos(null);
        return;
      }
      const mention = findActiveMemberMention(text, pos);
      if (!mention) {
        setActive(null);
        setMenuPos(null);
        return;
      }
      setActive(mention);
      if (inlineMenu) {
        setMenuPos({ top: 0, left: 0 });
        return;
      }
      const field = el.getBoundingClientRect();
      try {
        const coords = getTextareaCaretClientRect(el, pos);
        if (Number.isFinite(coords.top) && Number.isFinite(coords.left)) {
          setMenuPos({ top: coords.top + coords.height + 6, left: coords.left });
          return;
        }
      } catch {
        /* fall through */
      }
      setMenuPos({ top: field.bottom + 6, left: field.left });
    },
    [inlineMenu],
  );

  const syncMention = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    setCaret(pos);
    updateMentionMenu(value, pos, el);
  }, [updateMentionMenu, value]);

  useEffect(() => {
    syncMention();
  }, [syncMention, value, caret, members, membersLoading]);

  const options = useMemo(() => {
    if (!active) return [];
    return filterMemberMentionOptions(members, active.query);
  }, [active, members]);

  const pickMember = (member: MemberMentionSuggestion) => {
    const el = textareaRef.current;
    if (!el || !active) return;
    const pos = el.selectionStart ?? caret;
    const { text, caret: nextCaret } = insertMemberMentionInText(value, pos, active, member);
    onChange(text);
    setActive(null);
    setMenuPos(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  };

  const menu = active && menuPos && (
    <MemberMentionMenu
      top={menuPos.top}
      left={menuPos.left}
      placement={inlineMenu ? 'inline' : 'fixed'}
      options={options}
      onPick={pickMember}
      loading={membersLoading && members.length === 0}
    />
  );

  return (
    <div className={inlineMenu ? 'relative' : undefined}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          const pos = e.target.selectionStart ?? 0;
          onChange(next);
          setCaret(pos);
          updateMentionMenu(next, pos, e.target);
        }}
        onKeyDown={(e) => {
          if (active && (options.length > 0 || membersLoading)) {
            if (options.length === 1 && (e.key === 'Enter' || e.key === 'Tab')) {
              e.preventDefault();
              pickMember(options[0]!);
              return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              return;
            }
          }
          if (e.key === 'Escape' && active) {
            e.stopPropagation();
            setActive(null);
            setMenuPos(null);
            return;
          }
          onKeyDown?.(e);
        }}
        onKeyUp={() => syncMention()}
        onSelect={(e) => {
          setCaret(e.currentTarget.selectionStart ?? 0);
          onSelect?.(e);
          syncMention();
        }}
        onClick={(e) => {
          setCaret(e.currentTarget.selectionStart ?? 0);
          onClick?.(e);
          syncMention();
        }}
        className={className}
        {...rest}
      />
      {inlineMenu && menu ? <div className="absolute left-0 right-0 top-full mt-1">{menu}</div> : null}
      {!inlineMenu && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}