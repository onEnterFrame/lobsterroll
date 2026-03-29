import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

/** Wraps @mentions in a markdown-safe placeholder that survives GFM parsing. */
function preprocessMentions(content: string): string {
  // Replace @mention with a span-like HTML that ReactMarkdown will pass through
  return content.replace(/@([\w.-]+)/g, '**@$1**');
}

/** Custom renderer for strong nodes — detect @mention pattern and render highlighted span. */
function MentionAwareStrong({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) {
  const text = typeof children === 'string' ? children : '';
  if (text.startsWith('@')) {
    return <span className="text-lobster-light font-semibold">{text}</span>;
  }
  return <strong {...props}>{children}</strong>;
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
          {message.editedAt && (
            <span className="text-[10px] text-white/20 italic">(edited)</span>
          )}
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isOwn
              ? 'bg-lobster text-white rounded-tr-sm'
              : 'bg-ocean-lighter text-white/90 rounded-tl-sm'
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-0.5 prose-pre:bg-black/30 prose-pre:text-xs prose-code:text-lobster-light prose-code:bg-black/20 prose-code:px-1 prose-code:rounded">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: MentionAwareStrong,
              }}
            >
              {preprocessMentions(message.content)}
            </ReactMarkdown>
          </div>
        </div>
        {/* Attachments */}
        <AttachmentRenderer attachments={message.attachments} />
        {/* Thread indicator */}
        {onOpenThread && !message.threadId && (
          <button
            onClick={() => onOpenThread(message)}
            className={`flex items-center gap-1.5 mt-1.5 text-[11px] font-medium transition rounded-md px-2 py-0.5 ${
              threadReplyCount
                ? 'text-lobster-light bg-lobster/10 hover:bg-lobster/20'
                : 'text-white/25 hover:text-white/50 hover:bg-white/5'
            }`}
          >
            🧵 {threadReplyCount
              ? `${threadReplyCount} ${threadReplyCount === 1 ? 'reply' : 'replies'}`
              : 'Reply in thread'}
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
