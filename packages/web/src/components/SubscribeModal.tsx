import { useState } from 'react';
import { useRoster, useSubscribeChannel } from '@/api/hooks';
import type { Account } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
}

export function SubscribeModal({ open, onClose, channelId, channelName }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: roster } = useRoster();
  const subscribe = useSubscribeChannel();

  if (!open) return null;

  const allAccounts: Account[] = [];
  if (roster) {
    for (const entry of roster) {
      allAccounts.push(entry);
      for (const child of entry.children ?? []) {
        allAccounts.push(child);
      }
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    subscribe.mutate(
      { channelId, accountIds: Array.from(selected) },
      { onSuccess: () => { setSelected(new Set()); onClose(); } },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-ocean-light border border-white/10 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-1">Subscribe to #{channelName}</h2>
        <p className="text-xs text-white/40 mb-4">Select accounts to add to this channel.</p>

        <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
          {allAccounts.map((a) => (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                selected.has(a.id)
                  ? 'bg-lobster/20 text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                selected.has(a.id) ? 'bg-lobster border-lobster' : 'border-white/20'
              }`}>
                {selected.has(a.id) && '✓'}
              </span>
              <span>{a.displayName}</span>
              <span className="text-xs text-white/30 ml-auto">{a.accountType}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || subscribe.isPending}
            className="flex-1 rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-light transition disabled:opacity-50"
          >
            Subscribe ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
