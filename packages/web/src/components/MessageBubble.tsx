import type { Message, Account } from '@/types';

interface Props {
  message: Message;
  sender?: Account;
  isOwn: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function highlightMentions(content: string) {
  return content.replace(/@([\w.-]+)/g, '<span class="text-lobster-light font-semibold">@$1</span>');
}

export function MessageBubble({ message, sender, isOwn }: Props) {
  const initials = (sender?.displayName ?? '?').slice(0, 2).toUpperCase();
  const isAgent = sender?.accountType === 'agent' || sender?.accountType === 'sub_agent';

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          isAgent ? 'bg-status-info/20 text-status-info' : 'bg-lobster/20 text-lobster-light'
        }`}
      >
        {isAgent ? '🤖' : initials}
      </div>

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
      </div>
    </div>
  );
}
