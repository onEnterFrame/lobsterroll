import type { Account } from '@/types';
import { useUpdateAccount } from '@/api/hooks';

interface Props {
  account: Account;
  pendingMentionCount?: number;
}

function statusColor(status: string) {
  if (status === 'active') return 'bg-status-ok';
  if (status === 'frozen') return 'bg-status-warn';
  return 'bg-status-danger';
}

function mentionColor(count: number) {
  if (count === 0) return 'text-white/40';
  if (count <= 2) return 'text-status-ok';
  if (count <= 5) return 'text-status-warn';
  return 'text-status-danger';
}

export function AgentCard({ account, pendingMentionCount = 0 }: Props) {
  const updateAccount = useUpdateAccount();

  const toggleFreeze = () => {
    const newStatus = account.status === 'frozen' ? 'active' : 'frozen';
    updateAccount.mutate({ id: account.id, status: newStatus });
  };

  return (
    <div className="rounded-xl bg-ocean-light border border-white/5 p-4 hover:border-white/10 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor(account.status)}`} />
          <span className="text-sm font-semibold text-white">{account.displayName}</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-status-info/10 text-status-info">
            {account.accountType === 'sub_agent' ? 'sub-agent' : 'agent'}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-white/50">
        <div className="flex justify-between">
          <span>Status</span>
          <span className="text-white/70 capitalize">{account.status}</span>
        </div>
        <div className="flex justify-between">
          <span>Pending mentions</span>
          <span className={`font-medium ${mentionColor(pendingMentionCount)}`}>
            {pendingMentionCount}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Joined</span>
          <span className="text-white/70">
            {new Date(account.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <button
          onClick={toggleFreeze}
          disabled={updateAccount.isPending || account.status === 'deactivated'}
          className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            account.status === 'frozen'
              ? 'bg-status-ok/10 text-status-ok hover:bg-status-ok/20'
              : 'bg-status-warn/10 text-status-warn hover:bg-status-warn/20'
          } disabled:opacity-50`}
        >
          {account.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
        </button>
      </div>
    </div>
  );
}
