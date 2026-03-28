import { useState } from 'react';
import type { ChannelDoc, Account } from '@/types';
import { api } from '@/api/client';

interface Props {
  docs: ChannelDoc[];
  channelId: string;
  accounts: Map<string, Account>;
  onUpdate: () => void;
}

function DocEditor({ doc, onSave, onCancel }: {
  doc: ChannelDoc;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg bg-ocean border border-white/10 px-3 py-1.5 text-sm text-white font-medium placeholder:text-white/30 focus:border-lobster focus:outline-none"
        placeholder="Document title"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="w-full resize-none rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white/90 font-mono placeholder:text-white/30 focus:border-lobster focus:outline-none"
        placeholder="Write your doc content here... (supports markdown)"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(title, content)}
          className="rounded-lg bg-lobster/20 px-3 py-1.5 text-xs font-medium text-lobster-light hover:bg-lobster/30 transition"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DocView({ doc, accounts, onEdit, onDelete, onTogglePin }: {
  doc: ChannelDoc;
  accounts: Map<string, Account>;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const editor = accounts.get(doc.lastEditedBy);
  const timeAgo = formatTimeAgo(doc.updatedAt);

  return (
    <div className={`rounded-xl bg-ocean border p-4 hover:border-white/10 transition ${doc.pinned ? 'border-lobster/30' : 'border-white/5'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {doc.pinned && <span className="text-xs" title="Pinned">📌</span>}
          <h4 className="text-sm font-semibold text-white">{doc.title}</h4>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onTogglePin}
            className={`rounded p-1 transition ${doc.pinned ? 'text-lobster-light hover:text-white/70' : 'text-white/30 hover:text-lobster-light'} hover:bg-white/5`}
            title={doc.pinned ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1 text-white/30 hover:text-white/70 hover:bg-white/5 transition"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>
      <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
        {doc.content || '(empty)'}
      </pre>
      <div className="mt-2 text-[10px] text-white/30">
        Last edited by {editor?.displayName ?? 'Unknown'} · {timeAgo}
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DocPanel({ docs, channelId, accounts, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.post('/v1/docs', {
        channelId,
        title: newTitle.trim(),
        content: newContent,
      });
      setCreating(false);
      setNewTitle('');
      setNewContent('');
      onUpdate();
    } catch (err) {
      console.error('Failed to create doc:', err);
    }
  };

  const handleSave = async (docId: string, title: string, content: string) => {
    try {
      await api.patch(`/v1/docs/${docId}`, { title, content });
      setEditingId(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to update doc:', err);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/v1/docs/${docId}`);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  const handleTogglePin = async (docId: string, currentlyPinned: boolean) => {
    try {
      await api.patch(`/v1/docs/${docId}`, { pinned: !currentlyPinned });
      onUpdate();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Sort: pinned first, then by updatedAt
  const sortedDocs = [...docs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">📄 Channel Docs</h3>
        <button
          onClick={() => setCreating(!creating)}
          className="rounded-lg bg-lobster/20 px-2.5 py-1 text-xs font-medium text-lobster-light hover:bg-lobster/30 transition"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {creating && (
          <div className="rounded-xl bg-ocean-lighter border border-lobster/20 p-4 space-y-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg bg-ocean border border-white/10 px-3 py-1.5 text-sm text-white font-medium placeholder:text-white/30 focus:border-lobster focus:outline-none"
              placeholder="Document title"
              autoFocus
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white/90 font-mono placeholder:text-white/30 focus:border-lobster focus:outline-none"
              placeholder="Content..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="rounded-lg bg-lobster/20 px-3 py-1.5 text-xs font-medium text-lobster-light hover:bg-lobster/30 transition disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewTitle(''); setNewContent(''); }}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {docs.length === 0 && !creating && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2 opacity-30">📄</div>
            <p className="text-xs text-white/30">No docs yet. Create one to share context.</p>
          </div>
        )}

        {sortedDocs.map((doc) =>
          editingId === doc.id ? (
            <DocEditor
              key={doc.id}
              doc={doc}
              onSave={(title, content) => handleSave(doc.id, title, content)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <DocView
              key={doc.id}
              doc={doc}
              accounts={accounts}
              onEdit={() => setEditingId(doc.id)}
              onDelete={() => handleDelete(doc.id)}
              onTogglePin={() => handleTogglePin(doc.id, doc.pinned)}
            />
          ),
        )}
      </div>
    </div>
  );
}
