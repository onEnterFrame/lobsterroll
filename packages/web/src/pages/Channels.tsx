import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useChannels } from '@/api/hooks';
import { CreateChannelModal } from '@/components/CreateChannelModal';
import { SubscribeModal } from '@/components/SubscribeModal';
import type { Channel } from '@/types';

export function Channels() {
  const { data: channels, isLoading } = useChannels();
  const [showCreate, setShowCreate] = useState(false);
  const [subscribeTarget, setSubscribeTarget] = useState<Channel | null>(null);
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Channels</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-light transition"
          >
            + New Channel
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-white/40 text-sm py-12">Loading channels...</div>
        ) : !channels?.length ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-40">#</div>
            <p className="text-white/40 text-sm mb-4">No channels yet. Create one to get started!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-lobster/20 px-4 py-2 text-sm text-lobster-light hover:bg-lobster/30 transition"
            >
              Create your first channel
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between rounded-xl bg-ocean-light border border-white/5 p-4 hover:border-white/10 transition"
              >
                <button
                  onClick={() => navigate(`/channels/${ch.id}`)}
                  className="flex items-center gap-3 min-w-0 text-left"
                >
                  <span className="text-lg text-white/30">#</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{ch.name}</p>
                    {ch.topic && (
                      <p className="text-xs text-white/40 truncate">{ch.topic}</p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ch.visibility === 'public'
                      ? 'bg-status-ok/10 text-status-ok'
                      : 'bg-status-warn/10 text-status-warn'
                  }`}>
                    {ch.visibility}
                  </span>
                  <button
                    onClick={() => setSubscribeTarget(ch)}
                    className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded hover:bg-white/5 transition"
                  >
                    + Members
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateChannelModal open={showCreate} onClose={() => setShowCreate(false)} />
        {subscribeTarget && (
          <SubscribeModal
            open={!!subscribeTarget}
            onClose={() => setSubscribeTarget(null)}
            channelId={subscribeTarget.id}
            channelName={subscribeTarget.name}
          />
        )}
      </div>
    </div>
  );
}
