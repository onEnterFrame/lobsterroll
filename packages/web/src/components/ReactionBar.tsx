import { useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { Account } from '@/types';

interface ReactionGroup {
  emoji: string;
  count: number;
  semanticMeaning: string | null;
  accountIds: string[];
}

interface Props {
  messageId: string;
  reactions: ReactionGroup[];
  accounts: Map<string, Account>;
  onUpdate: () => void;
}

const QUICK_REACTIONS = ['✅', '👀', '🚫', '👍', '🎯', '⏳', '🔥'];

const SEMANTIC_LABELS: Record<string, string> = {
  will_handle: "I'll handle this",
  reviewing: 'Reviewing',
  blocked: 'Blocked',
  agree: 'Agree',
  disagree: 'Disagree',
  priority: 'Priority',
  in_progress: 'In progress',
  urgent: 'Urgent',
};

export function ReactionBar({ messageId, reactions, accounts, onUpdate }: Props) {
  const { currentAccount } = useAuth();
  const [showPicker, setShowPicker] = useState(false);

  const handleToggle = async (emoji: string) => {
    try {
      await api.post('/v1/reactions', { messageId, emoji });
      onUpdate();
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactions.map((r) => {
        const isMine = currentAccount ? r.accountIds.includes(currentAccount.id) : false;
        const names = r.accountIds.map((id) => accounts.get(id)?.displayName ?? 'Unknown').join(', ');
        const semanticLabel = r.semanticMeaning ? SEMANTIC_LABELS[r.semanticMeaning] : null;
        const tooltip = semanticLabel ? `${semanticLabel} — ${names}` : names;

        return (
          <button
            key={r.emoji}
            onClick={() => handleToggle(r.emoji)}
            title={tooltip}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
              isMine
                ? 'bg-lobster/20 border border-lobster/40 text-white'
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition"
          title="Add reaction"
        >
          +
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 rounded-lg bg-ocean border border-white/10 shadow-xl p-1.5 flex gap-1 z-50">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleToggle(emoji)}
                className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-sm transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
