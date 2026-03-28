import { useState } from 'react';
import type { Approval, Account } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';

interface Props {
  approval: Approval;
  requester?: Account;
  onUpdate: () => void;
}

function statusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'Awaiting Approval', bg: 'bg-amber-500/15', text: 'text-amber-400', icon: '🔐' };
    case 'approved':
      return { label: 'Approved', bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: '✅' };
    case 'denied':
      return { label: 'Denied', bg: 'bg-red-500/15', text: 'text-red-400', icon: '❌' };
    default:
      return { label: status, bg: 'bg-white/10', text: 'text-white/60', icon: '🔐' };
  }
}

export function InlineApprovalCard({ approval, requester, onUpdate }: Props) {
  const { currentAccount } = useAuth();
  const isHuman = currentAccount?.accountType === 'human';
  const badge = statusBadge(approval.status);
  const [loading, setLoading] = useState(false);
  const description = (approval.actionData as Record<string, unknown>)?.description as string | undefined;

  const handleDecision = async (decision: 'approved' | 'denied') => {
    setLoading(true);
    try {
      await api.post(`/v1/approvals/${approval.id}/decide`, { decision });
      onUpdate();
    } catch (err) {
      console.error(`Failed to ${decision} approval:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-ocean-light p-4 my-2">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{badge.icon}</span>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>
        <span className="text-[10px] text-white/30">
          {new Date(approval.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <p className="text-sm text-white font-medium mb-1">{approval.actionType}</p>
      {description && (
        <p className="text-xs text-white/60 mb-3">{description}</p>
      )}

      <div className="text-xs text-white/40 mb-3">
        Requested by <span className="text-white/70 font-medium">{requester?.displayName ?? 'Unknown'}</span>
      </div>

      {isHuman && approval.status === 'pending' && (
        <div className="border-t border-white/5 pt-3 flex gap-2">
          <button
            onClick={() => handleDecision('approved')}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => handleDecision('denied')}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
