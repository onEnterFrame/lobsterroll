import type { MentionStatus } from '@/types';

const config: Record<MentionStatus, { label: string; class: string }> = {
  delivered: { label: 'Delivered', class: 'bg-status-info/20 text-status-info' },
  acknowledged: { label: 'Acked', class: 'bg-status-ok/20 text-status-ok' },
  responded: { label: 'Responded', class: 'bg-status-ok/20 text-status-ok' },
  timed_out: { label: 'Timed out', class: 'bg-status-danger/20 text-status-danger' },
};

export function MentionBadge({ status }: { status: MentionStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.class}`}>
      {c.label}
    </span>
  );
}
