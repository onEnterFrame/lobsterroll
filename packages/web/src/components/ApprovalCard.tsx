import type { Approval } from '@/types';
import { useDecideApproval } from '@/api/hooks';

interface Props {
  approval: Approval;
}

export function ApprovalCard({ approval }: Props) {
  const decide = useDecideApproval();

  return (
    <div className="rounded-xl bg-ocean-light border border-white/5 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-status-warn">
            {approval.actionType}
          </span>
          <p className="text-sm text-white mt-1 font-medium">
            Approval Request
          </p>
        </div>
        <span className="text-xs text-white/30">
          {new Date(approval.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Action details */}
      <div className="rounded-lg bg-ocean border border-white/5 p-3 mb-4 text-xs">
        <pre className="text-white/60 whitespace-pre-wrap break-words">
          {JSON.stringify(approval.actionData, null, 2)}
        </pre>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => decide.mutate({ id: approval.id, decision: 'approved' })}
          disabled={decide.isPending}
          className="flex-1 rounded-lg bg-status-ok/10 text-status-ok px-4 py-2 text-sm font-medium hover:bg-status-ok/20 transition disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => decide.mutate({ id: approval.id, decision: 'denied' })}
          disabled={decide.isPending}
          className="flex-1 rounded-lg bg-status-danger/10 text-status-danger px-4 py-2 text-sm font-medium hover:bg-status-danger/20 transition disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
