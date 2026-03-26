import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingApprovals } from '@/api/hooks';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ApprovalCard } from '@/components/ApprovalCard';
import type { WsEvent } from '@/types';

export function Approvals() {
  const { data: approvals, isLoading } = usePendingApprovals();
  const qc = useQueryClient();

  const handleWsEvent = useCallback(
    (event: WsEvent) => {
      if (event.type === 'approval.requested') {
        qc.invalidateQueries({ queryKey: ['approvals'] });
      }
    },
    [qc],
  );

  useWebSocket(handleWsEvent);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6">Pending Approvals</h1>

        {isLoading ? (
          <div className="text-center text-white/40 text-sm py-12">Loading...</div>
        ) : !approvals?.length ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-40">✅</div>
            <p className="text-white/40 text-sm">No pending approvals. All clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((a) => (
              <ApprovalCard key={a.id} approval={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
