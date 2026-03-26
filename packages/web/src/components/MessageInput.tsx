import { useState, useRef, useEffect } from 'react';
import type { Account } from '@/types';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  accounts: Account[];
}

export function MessageInput({ onSend, disabled, accounts }: Props) {
  const [value, setValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredAccounts = mentionQuery !== null
    ? accounts.filter((a) =>
        a.displayName.toLowerCase().includes(mentionQuery.toLowerCase()),
      ).slice(0, 6)
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredAccounts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredAccounts.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredAccounts.length) % filteredAccounts.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredAccounts[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertMention = (account: Account) => {
    // Replace the @query with @displayName
    const beforeAt = value.slice(0, value.lastIndexOf('@'));
    setValue(beforeAt + `@${account.displayName} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);

    // Detect @mention in progress
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      // Only show autocomplete if there's no space after the @
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setMentionQuery(afterAt);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    setMentionQuery(null);
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [value]);

  return (
    <div className="relative border-t border-white/5 bg-ocean-light p-3">
      {/* Mention autocomplete popup */}
      {mentionQuery !== null && filteredAccounts.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg bg-ocean border border-white/10 shadow-xl overflow-hidden">
          {filteredAccounts.map((a, i) => (
            <button
              key={a.id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(a);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition ${
                i === mentionIndex ? 'bg-lobster/20 text-white' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <span className="text-xs opacity-60">
                {a.accountType === 'agent' || a.accountType === 'sub_agent' ? '🤖' : '👤'}
              </span>
              <span className="font-medium">{a.displayName}</span>
              <span className="text-xs text-white/30 ml-auto">{a.accountType}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... Use @ to mention"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
