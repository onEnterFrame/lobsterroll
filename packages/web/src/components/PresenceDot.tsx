import type { PresenceStatus } from '@/types';

interface Props {
  status: PresenceStatus;
  statusMessage?: string | null;
  lastSeenAt?: string | null;
  size?: 'sm' | 'md';
}

function dotColor(status: PresenceStatus) {
  switch (status) {
    case 'online':
      return 'bg-emerald-400';
    case 'idle':
      return 'bg-amber-400';
    case 'dnd':
      return 'bg-red-400';
    case 'offline':
    default:
      return 'bg-white/20';
  }
}

function statusLabel(status: PresenceStatus) {
  switch (status) {
    case 'online':
      return 'Online';
    case 'idle':
      return 'Idle';
    case 'dnd':
      return 'Do Not Disturb';
    case 'offline':
    default:
      return 'Offline';
  }
}

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PresenceDot({ status, statusMessage, lastSeenAt, size = 'sm' }: Props) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  const tooltipParts = [statusLabel(status)];
  if (statusMessage) tooltipParts.push(`"${statusMessage}"`);
  if (status === 'offline' && lastSeenAt) {
    tooltipParts.push(`Last seen ${formatLastSeen(lastSeenAt)}`);
  }

  return (
    <span
      className={`inline-block ${sizeClass} rounded-full ${dotColor(status)} flex-shrink-0`}
      title={tooltipParts.join(' · ')}
    />
  );
}
