import type { PresenceStatus } from '@/types';
import { PresenceDot } from './PresenceDot';

interface Props {
  displayName: string;
  avatarUrl?: string | null;
  accountType?: string;
  presenceStatus?: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

const dotPositions = {
  sm: '-bottom-0.5 -right-0.5',
  md: '-bottom-0.5 -right-0.5',
  lg: 'bottom-0 right-0',
};

export function Avatar({ displayName, avatarUrl, accountType, presenceStatus, size = 'sm' }: Props) {
  const initials = displayName.slice(0, 2).toUpperCase();
  const isAgent = accountType === 'agent' || accountType === 'sub_agent';

  return (
    <div className="relative flex-shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizeMap[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold ${
            isAgent ? 'bg-status-info/20 text-status-info' : 'bg-lobster/20 text-lobster-light'
          }`}
        >
          {isAgent ? '🤖' : initials}
        </div>
      )}
      {presenceStatus && (
        <span className={`absolute ${dotPositions[size]}`}>
          <PresenceDot status={presenceStatus} />
        </span>
      )}
    </div>
  );
}
