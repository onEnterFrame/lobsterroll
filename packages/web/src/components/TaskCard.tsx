import { useState } from 'react';
import type { MessageTask, Account } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';

interface Props {
  task: MessageTask;
  assigner?: Account;
  assignee?: Account;
  onUpdate: (updated: MessageTask) => void;
}

function statusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'Pending', bg: 'bg-amber-500/15', text: 'text-amber-400', icon: '⏳' };
    case 'accepted':
      return { label: 'In Progress', bg: 'bg-blue-500/15', text: 'text-blue-400', icon: '🔧' };
    case 'completed':
      return { label: 'Completed', bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: '✅' };
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-red-500/15', text: 'text-red-400', icon: '❌' };
    default:
      return { label: status, bg: 'bg-white/10', text: 'text-white/60', icon: '📋' };
  }
}

export function TaskCard({ task, assigner, assignee, onUpdate }: Props) {
  const { currentAccount } = useAuth();
  const isAssignee = currentAccount?.id === task.assigneeId;
  const badge = statusBadge(task.status);
  const [loading, setLoading] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showNote, setShowNote] = useState(false);

  const handleAction = async (action: 'accept' | 'complete' | 'reject') => {
    setLoading(true);
    try {
      const body = action !== 'accept' && noteInput.trim()
        ? { note: noteInput.trim() }
        : {};
      const updated = await api.put<MessageTask>(`/v1/tasks/${task.id}/${action}`, body);
      onUpdate(updated);
      setShowNote(false);
      setNoteInput('');
    } catch (err) {
      console.error(`Failed to ${action} task:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-ocean-light p-4 my-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{badge.icon}</span>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>
        <span className="text-[10px] text-white/30">
          {new Date(task.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm text-white font-medium mb-2">{task.title}</p>

      {/* Assignment info */}
      <div className="flex items-center gap-3 text-xs text-white/50 mb-3">
        <span>
          From <span className="text-white/70 font-medium">{assigner?.displayName ?? 'Unknown'}</span>
        </span>
        <span>→</span>
        <span>
          To <span className="text-white/70 font-medium">{assignee?.displayName ?? 'Unknown'}</span>
        </span>
      </div>

      {/* Note (if completed/rejected with note) */}
      {task.note && (
        <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60 italic mb-3">
          "{task.note}"
        </div>
      )}

      {/* Actions — only for assignee on actionable tasks */}
      {isAssignee && (task.status === 'pending' || task.status === 'accepted') && (
        <div className="border-t border-white/5 pt-3 space-y-2">
          {showNote && (
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add a note (optional)..."
              className="w-full rounded-lg bg-ocean border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-lobster focus:outline-none"
            />
          )}
          <div className="flex gap-2">
            {task.status === 'pending' && (
              <button
                onClick={() => handleAction('accept')}
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/25 transition disabled:opacity-50"
              >
                Accept
              </button>
            )}
            <button
              onClick={() => {
                if (!showNote) { setShowNote(true); return; }
                handleAction('complete');
              }}
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition disabled:opacity-50"
            >
              Complete
            </button>
            <button
              onClick={() => {
                if (!showNote) { setShowNote(true); return; }
                handleAction('reject');
              }}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Timestamps for completed/rejected */}
      {task.completedAt && (
        <div className="text-[10px] text-emerald-400/60 mt-1">
          Completed {new Date(task.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      {task.rejectedAt && (
        <div className="text-[10px] text-red-400/60 mt-1">
          Rejected {new Date(task.rejectedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
