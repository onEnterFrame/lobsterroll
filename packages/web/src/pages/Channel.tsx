import { useMemo, useCallback } from 'react';
import { useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useMessages, useSendMessage, useRoster, useChannels } from '@/api/hooks';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { handlePresenceEvent } from '@/hooks/usePresence';
import type { Message, Account, WsEvent } from '@/types';

export function Channel() {
  const { channelId } = useParams<{ channelId: string }>();
  const { currentAccount } = useAuth();
  const qc = useQueryClient();

  const { data: channels } = useChannels();
  const channel = channels?.find((c) => c.id === channelId);
  const { data: messagesData, isLoading } = useMessages(channelId!);
  const { data: roster } = useRoster();
  const sendMessage = useSendMessage();

  // Build account lookup map from roster
  const accountsMap = useMemo(() => {
    const map = new Map<string, Account>();
    if (roster) {
      for (const entry of roster) {
        map.set(entry.id, entry);
        for (const child of entry.children ?? []) {
          map.set(child.id, child);
        }
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

  // WebSocket handler for real-time messages
  const handleWsEvent = useCallback(
    (event: WsEvent) => {
      // Handle presence updates
      handlePresenceEvent(event);

      if (event.type === 'message.new' && event.data.channelId === channelId) {
        qc.setQueryData<{ messages: Message[]; nextCursor: string | null }>(
          ['messages', channelId, undefined],
          (old) => {
            if (!old) return { messages: [event.data], nextCursor: null };
            // Avoid duplicates
            if (old.messages.some((m) => m.id === event.data.id)) return old;
            return { ...old, messages: [...old.messages, event.data] };
          },
        );
        // If sender is unknown (new agent just created), refresh roster
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
    },
    [channelId, qc],
  );

  useWebSocket(handleWsEvent);

  const handleSend = (content: string) => {
    if (!channelId) return;
    sendMessage.mutate({ channelId, content });
  };

  if (!channelId) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        Select a channel
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <span className="text-white/30 text-lg">#</span>
        <div>
          <h2 className="font-semibold text-white">{channel?.name ?? 'Channel'}</h2>
          {channel?.topic && (
            <p className="text-xs text-white/40">{channel.topic}</p>
          )}
        </div>
      </header>

      {/* Messages */}
      <MessageList
        messages={messages}
        accounts={accountsMap}
        currentAccountId={currentAccount?.id ?? ''}
        isLoading={isLoading}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        disabled={sendMessage.isPending}
        accounts={allAccounts}
      />
    </div>
  );
}
