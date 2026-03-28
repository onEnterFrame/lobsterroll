import { useMemo, useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMessages, useSendMessage, useRoster, useChannels } from '@/api/hooks';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { DocPanel } from '@/components/DocPanel';
import { handlePresenceEvent } from '@/hooks/usePresence';
import { api } from '@/api/client';
import type { Message, MessageTask, ChannelDoc, Account, WsEvent } from '@/types';

export function Channel() {
  const { channelId } = useParams<{ channelId: string }>();
  const { currentAccount } = useAuth();
  const qc = useQueryClient();
  const [showDocs, setShowDocs] = useState(false);

  const { data: channels } = useChannels();
  const channel = channels?.find((c) => c.id === channelId);
  const { data: messagesData, isLoading } = useMessages(channelId!);
  const { data: roster } = useRoster();
  const sendMessage = useSendMessage();

  // Fetch tasks for this channel
  const { data: channelTasks } = useQuery<MessageTask[]>({
    queryKey: ['tasks', channelId],
    queryFn: () => api.get(`/v1/tasks?channelId=${channelId}`),
    enabled: !!channelId,
  });

  // Fetch docs for this channel
  const { data: channelDocs } = useQuery<ChannelDoc[]>({
    queryKey: ['docs', channelId],
    queryFn: () => api.get(`/v1/docs?channelId=${channelId}`),
    enabled: !!channelId,
  });

  // Build task lookup by messageId
  const tasksMap = useMemo(() => {
    const map = new Map<string, MessageTask>();
    if (channelTasks) {
      for (const task of channelTasks) {
        map.set(task.messageId, task);
      }
    }
    return map;
  }, [channelTasks]);

  // Build account lookup map from roster (recursive)
  const accountsMap = useMemo(() => {
    const map = new Map<string, Account>();
    function addRecursive(account: Account & { children?: Account[] }) {
      map.set(account.id, account);
      for (const child of account.children ?? []) {
        addRecursive(child as Account & { children?: Account[] });
      }
    }
    if (roster) {
      for (const entry of roster) {
        addRecursive(entry);
      }
    }
    return map;
  }, [roster]);

  const allAccounts = useMemo(() => Array.from(accountsMap.values()), [accountsMap]);

  // Sorted messages (oldest first)
  const messages = useMemo(() => {
    const msgs = messagesData?.messages ?? [];
    return [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messagesData]);

  // WebSocket handler
  const handleWsEvent = useCallback(
    (event: WsEvent) => {
      handlePresenceEvent(event);

      if (event.type === 'message.new' && event.data.channelId === channelId) {
        qc.setQueryData<{ messages: Message[]; nextCursor: string | null }>(
          ['messages', channelId, undefined],
          (old) => {
            if (!old) return { messages: [event.data], nextCursor: null };
            if (old.messages.some((m) => m.id === event.data.id)) return old;
            return { ...old, messages: [...old.messages, event.data] };
          },
        );
        const senderId = event.data.senderId;
        const currentRoster = qc.getQueryData<typeof roster>(['roster']);
        const knownIds = new Set<string>();
        if (currentRoster) {
          for (const entry of currentRoster) {
            knownIds.add(entry.id);
            for (const child of entry.children ?? []) knownIds.add(child.id);
          }
        }
        if (!knownIds.has(senderId)) {
          qc.invalidateQueries({ queryKey: ['roster'] });
        }
      }

      if (event.type === 'task.created' || event.type === 'task.updated' || event.type === 'task.assigned') {
        if (event.data.channelId === channelId) {
          qc.invalidateQueries({ queryKey: ['tasks', channelId] });
        }
      }

      if (event.type === 'doc.created' || event.type === 'doc.updated') {
        if (event.data.channelId === channelId) {
          qc.invalidateQueries({ queryKey: ['docs', channelId] });
        }
      }
      if (event.type === 'doc.deleted') {
        if (event.data.channelId === channelId) {
          qc.invalidateQueries({ queryKey: ['docs', channelId] });
        }
      }
    },
    [channelId, qc],
  );

  useWebSocket(handleWsEvent);

  const handleSend = (content: string) => {
    if (!channelId) return;
    sendMessage.mutate({ channelId, content });
  };

  const handleTaskUpdate = () => {
    qc.invalidateQueries({ queryKey: ['tasks', channelId] });
  };

  const handleDocsUpdate = () => {
    qc.invalidateQueries({ queryKey: ['docs', channelId] });
  };

  if (!channelId) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        Select a channel
      </div>
    );
  }

  const docCount = channelDocs?.length ?? 0;

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Channel header */}
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-lg">#</span>
            <div>
              <h2 className="font-semibold text-white">{channel?.name ?? 'Channel'}</h2>
              {channel?.topic && (
                <p className="text-xs text-white/40">{channel.topic}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowDocs(!showDocs)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              showDocs
                ? 'bg-lobster/20 text-lobster-light'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            📄 Docs{docCount > 0 && ` (${docCount})`}
          </button>
        </header>

        {/* Messages */}
        <MessageList
          messages={messages}
          accounts={accountsMap}
          tasksMap={tasksMap}
          currentAccountId={currentAccount?.id ?? ''}
          isLoading={isLoading}
          onTaskUpdate={handleTaskUpdate}
        />

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          disabled={sendMessage.isPending}
          accounts={allAccounts}
        />
      </div>

      {/* Doc panel (collapsible sidebar) */}
      {showDocs && (
        <div className="w-80 border-l border-white/5 bg-ocean-light flex-shrink-0">
          <DocPanel
            docs={channelDocs ?? []}
            channelId={channelId}
            accounts={accountsMap}
            onUpdate={handleDocsUpdate}
          />
        </div>
      )}
    </div>
  );
}
