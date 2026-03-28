import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { MessageBubble } from './MessageBubble';
import type { Message, Account } from '@/types';

interface Props {
  parentMessage: Message;
  accounts: Map<string, Account>;
  onClose: () => void;
  onReactionsUpdate: () => void;
}

export function ThreadPanel({ parentMessage, accounts, onClose, onReactionsUpdate }: Props) {
  const { currentAccount } = useAuth();
  const qc = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threadData, isLoading } = useQuery<{ messages: Message[]; nextCursor: string | null }>({
    queryKey: ['thread', parentMessage.id],
    queryFn: () => api.get(`/v1/messages?channelId=${parentMessage.channelId}&threadId=${parentMessage.id}`),
  });

  const replies = useMemo(() => {
    const msgs = threadData?.messages ?? [];
    return [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [threadData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  const handleSendReply = async () => {
    const trimmed = replyContent.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await api.post('/v1/messages', {
        channelId: parentMessage.channelId,
        content: trimmed,
        threadId: parentMessage.id,
      });
      setReplyContent('');
      qc.invalidateQueries({ queryKey: ['thread', parentMessage.id] });
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const parentSender = accounts.get(parentMessage.senderId);

  return (
    <div className="w-96 border-l border-white/5 bg-ocean-light flex flex-col flex-shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">🧵 Thread</h3>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition text-sm"
        >
          ✕
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-white/5 bg-ocean/50">
        <MessageBubble
          message={parentMessage}
          sender={parentSender}
          isOwn={currentAccount?.id === parentMessage.senderId}
          accounts={accounts}
          onReactionsUpdate={onReactionsUpdate}
        />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading && (
          <div className="text-center text-white/30 text-xs py-4">Loading replies...</div>
        )}
        {!isLoading && replies.length === 0 && (
          <div className="text-center text-white/30 text-xs py-4">No replies yet</div>
        )}
        {replies.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            sender={accounts.get(msg.senderId)}
            isOwn={currentAccount?.id === msg.senderId}
            accounts={accounts}
            onReactionsUpdate={onReactionsUpdate}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="border-t border-white/5 p-3">
        <div className="flex gap-2">
          <input
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
            placeholder="Reply in thread..."
            className="flex-1 rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-lobster focus:outline-none"
          />
          <button
            onClick={handleSendReply}
            disabled={sending || !replyContent.trim()}
            className="rounded-lg bg-lobster px-3 py-2 text-xs font-semibold text-white hover:bg-lobster-light disabled:opacity-50 transition"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}
