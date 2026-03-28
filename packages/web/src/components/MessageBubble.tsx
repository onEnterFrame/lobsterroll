import { useEffect, useState } from 'react';
import type { Message, Account, ReactionSummary } from '@/types';
import { useAccountPresence } from '@/hooks/usePresence';
import { Avatar } from './Avatar';
import { ReactionBar } from './ReactionBar';
import { AttachmentRenderer } from './AttachmentRenderer';
import { api } from '@/api/client';

interface Props {
  message: Message;
  sender?: Account;
  isOwn: boolean;
  accounts: Map<string, Account>;
  onReactionsUpdate: () => void;
  onOpenThread?: (message: Message) => void;
  threadReplyCount?: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function highlightMentions(content: string) {
  return content.replace(/@([\w.-]+)/g, '<span class="text-lobster-light font-semibold">@$1</span>');
}

export function MessageBubble({ message, sender, isOwn, accounts, onReactionsUpdate, onOpenThread, threadReplyCount }: Props) {
  const isAgent = sender?.accountType === 'agent' || sender?.accountType === 'sub_agent';
  const presence = useAccountPresence(message.senderId);
  const presenceStatus = presence?.status ?? sender?.presenceStatus ?? 'offline';
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);

  useEffect(() => {
    api.get<ReactionSummary[]>(`/v1/reactions/${message.id}`).then(setReactions).catch(() => {});
  }, [message.id]);

  const handleReactionUpdate = () => {
    api.get<ReactionSummary[]>(`/v1/reactions/${message.id}`).then(setReactions).catch(() => {});
    onReactionsUpdate();
  };

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar with presence indicator */}
      <Avatar
        displayName={sender?.displayName ?? '?'}
        avatarUrl={sender?.avatarUrl}
        accountType={sender?.accountType}
        presenceStatus={presenceStatus}
        size="sm"
      />

      {/* Bubble */}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={`text-xs font-semibold ${isAgent ? 'text-status-info' : 'text-white/80'}`}>
            {sender?.displayName ?? 'Unknown'}
          </span>
          {isAgent && (
            <span className="text-[10px] uppercase tracking-wider text-status-info/60 font-medium">
              agent
            </span>
          )}
          <span className="text-[10px] text-white/30">{formatTime(message.createdAt)}</span>
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isOwn
              ? 'bg-lobster text-white rounded-tr-sm'
              : 'bg-ocean-lighter text-white/90 rounded-tl-sm'
          }`}
          dangerouslySetInnerHTML={{ __html: highlightMentions(message.content) }}
        />
        {/* Attachments */}
        <AttachmentRenderer attachments={message.attachments} />
        {/* Thread */}
        {onOpenThread && !message.threadId && (
          <button
            onClick={() => onOpenThread(message)}
            className="flex items-center gap-1 mt-1 text-[10px] text-white/30 hover:text-lobster-light transition"
          >
            🧵 {threadReplyCount ? `${threadReplyCount} replies` : 'Reply in thread'}
          </button>
        )}
        {/* Reactions */}
        <ReactionBar
          messageId={message.id}
          reactions={reactions}
          accounts={accounts}
          onUpdate={handleReactionUpdate}
        />
      </div>
    </div>
  );
}
