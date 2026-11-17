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
};

export function MemberMentionTextarea({
  value,
  onChange,
  members,
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

  const syncMention = useCallback(() => {
    const el = textareaRef.current;
    if (!el || members.length === 0) {
      setActive(null);
      setMenuPos(null);
      return;
    }
    const pos = el.selectionStart ?? 0;
    setCaret(pos);
    const mention = findActiveMemberMention(value, pos);
    if (!mention) {
      setActive(null);
      setMenuPos(null);
      return;
    }
    setActive(mention);
    const coords = getTextareaCaretClientRect(el, pos);
    setMenuPos({ top: coords.top + coords.height + 6, left: coords.left });
  }, [value, members.length]);

  useEffect(() => {
    syncMention();
  }, [syncMention, value, caret]);

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

  return (
    <>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart ?? 0);
        }}
        onKeyDown={(e) => {
          if (active && options.length === 1 && (e.key === 'Enter' || e.key === 'Tab')) {
            e.preventDefault();
            pickMember(options[0]!);
            return;
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
      {active && menuPos && members.length > 0
        ? createPortal(
            <MemberMentionMenu
              top={menuPos.top}
              left={menuPos.left}
              options={options}
              onPick={pickMember}
            />,
            document.body,
          )
        : null}
    </>
  );
}