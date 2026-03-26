import { useState } from 'react';
import { useCreateChannel } from '@/api/hooks';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateChannelModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const createChannel = useCreateChannel();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createChannel.mutate(
      { name: name.trim(), topic: topic.trim() || undefined, visibility },
      {
        onSuccess: () => {
          setName('');
          setTopic('');
          setVisibility('public');
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-ocean-light border border-white/10 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Create Channel</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="general"
              autoFocus
              className="w-full rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-lobster focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Topic (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-lobster focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Visibility</label>
            <div className="flex gap-2">
              {(['public', 'private'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition border ${
                    visibility === v
                      ? 'border-lobster bg-lobster/10 text-lobster-light'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  {v === 'public' ? '🌐 Public' : '🔒 Private'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createChannel.isPending}
              className="flex-1 rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-light transition disabled:opacity-50"
            >
              {createChannel.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
