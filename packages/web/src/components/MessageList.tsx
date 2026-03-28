import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { TaskCard } from './TaskCard';
import type { Message, MessageTask, Account } from '@/types';

interface Props {
  messages: Message[];
  accounts: Map<string, Account>;
  tasksMap: Map<string, MessageTask>;
  currentAccountId: string;
  isLoading: boolean;
  onTaskUpdate: (updated: MessageTask) => void;
}

export function MessageList({ messages, accounts, tasksMap, currentAccountId, isLoading, onTaskUpdate }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
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
      {messages.map((msg) => {
        const task = tasksMap.get(msg.id);
        if (task) {
          return (
            <TaskCard
              key={msg.id}
              task={task}
              assigner={accounts.get(task.assignerId)}
              assignee={accounts.get(task.assigneeId)}
              onUpdate={onTaskUpdate}
            />
          );
        }
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            sender={accounts.get(msg.senderId)}
            isOwn={msg.senderId === currentAccountId}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
