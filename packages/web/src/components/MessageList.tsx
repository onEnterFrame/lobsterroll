import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message, Account } from '@/types';

interface Props {
  messages: Message[];
  accounts: Map<string, Account>;
  currentAccountId: string;
  isLoading: boolean;
}

export function MessageList({ messages, accounts, currentAccountId, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Auto-scroll when new messages arrive
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading messages...</div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2 opacity-40">💬</div>
          <p className="text-white/40 text-sm">No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          sender={accounts.get(msg.senderId)}
          isOwn={msg.senderId === currentAccountId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
