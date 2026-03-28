import type { Account } from '@/types';

interface Props {
  typingAccountIds: string[];
  accounts: Map<string, Account>;
  currentAccountId: string;
}

export function TypingIndicator({ typingAccountIds, accounts, currentAccountId }: Props) {
  const others = typingAccountIds.filter((id) => id !== currentAccountId);
  if (others.length === 0) return null;

  const names = others
    .map((id) => accounts.get(id)?.displayName ?? 'Someone')
    .slice(0, 3);

  let text: string;
  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else {
    text = `${names[0]} and ${names.length - 1} others are typing...`;
  }

  return (
    <div className="px-4 py-1 text-[11px] text-white/30 animate-pulse">
      {text}
    </div>
  );
}
