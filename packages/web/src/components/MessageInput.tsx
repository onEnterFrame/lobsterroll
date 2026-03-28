import { useState, useRef, useEffect, useCallback } from 'react';
import type { Account, MessageAttachment } from '@/types';
import { api } from '@/api/client';
import { parseSlashCommand, SLASH_COMMANDS } from '@/utils/slash-commands';
import type { SlashContext } from '@/utils/slash-commands';

interface Props {
  onSend: (content: string, attachments?: MessageAttachment[]) => void;
  disabled?: boolean;
  accounts: Account[];
  channelId?: string;
  currentAccountId?: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.startsWith('video/')) return '🎬';
  if (mime === 'application/pdf') return '📄';
  return '📎';
}

export function MessageInput({ onSend, disabled, accounts, channelId, currentAccountId, onTypingStart, onTypingStop }: Props) {
  const [value, setValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAccounts = mentionQuery !== null
    ? accounts.filter((a) =>
        a.displayName.toLowerCase().includes(mentionQuery.toLowerCase()),
      ).slice(0, 6)
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredAccounts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredAccounts.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredAccounts.length) % filteredAccounts.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredAccounts[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertMention = (account: Account) => {
    const beforeAt = value.slice(0, value.lastIndexOf('@'));
    setValue(beforeAt + `@${account.displayName} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  // Typing indicator debounce
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);

    // Typing indicator
    onTypingStart?.();
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onTypingStop?.(), 3000);

    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setMentionQuery(afterAt);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  // Show slash command hints
  const slashHint = value.startsWith('/') && !value.includes(' ')
    ? SLASH_COMMANDS.filter((c) => c.name.startsWith(value)).slice(0, 5)
    : [];

  const handleSend = async () => {
    const trimmed = value.trim();
    if ((!trimmed && pendingFiles.length === 0) || disabled || uploading) return;

    // Check for slash commands
    if (trimmed.startsWith('/') && channelId && currentAccountId) {
      const parsed = parseSlashCommand(trimmed);
      if (parsed) {
        const accountMap = new Map<string, { id: string; displayName: string }>();
        accounts.forEach((a) => accountMap.set(a.id, { id: a.id, displayName: a.displayName }));
        const ctx: SlashContext = { channelId, currentAccountId, accounts: accountMap };
        try {
          const result = await parsed.command.handler(parsed.args, ctx);
          if (result.handled) {
            setValue('');
            setMentionQuery(null);
            onTypingStop?.();
            return;
          }
          if (result.message) {
            // Show error as message — just send it as regular text for now
            onSend(`⚠️ ${result.message}`);
            setValue('');
            return;
          }
        } catch (err) {
          console.error('Slash command error:', err);
        }
      }
    }

    onSend(trimmed || '📎 Attachment', pendingFiles.length > 0 ? pendingFiles : undefined);
    setValue('');
    setPendingFiles([]);
    setMentionQuery(null);
    onTypingStop?.();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploaded: MessageAttachment[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Upload via fetch (multipart) — api helper doesn't handle FormData
        const apiKey = localStorage.getItem('lr_api_key');
        const headers: Record<string, string> = {};
        if (apiKey) headers['x-api-key'] = apiKey;

        const apiUrl = import.meta.env.VITE_API_URL ?? '';
        const res = await fetch(`${apiUrl}/v1/files/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (res.ok) {
          const result: MessageAttachment = await res.json();
          uploaded.push(result);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setPendingFiles((prev) => [...prev, ...uploaded]);
    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
    inputRef.current?.focus();
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [value]);

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      const input = fileInputRef.current;
      if (input) {
        // Create a new DataTransfer and set files
        const dt = new DataTransfer();
        for (const file of Array.from(e.dataTransfer.files)) {
          dt.items.add(file);
        }
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  return (
    <div
      className={`relative border-t border-white/5 bg-ocean-light p-3 ${dragOver ? 'ring-2 ring-lobster/40' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2 py-1">
              <span className="text-sm">{fileIcon(file.mimeType)}</span>
              <span className="text-xs text-white/70 truncate max-w-32">{file.filename}</span>
              <span className="text-[10px] text-white/30">{formatSize(file.size)}</span>
              <button
                onClick={() => removePendingFile(i)}
                className="text-white/30 hover:text-red-400 text-xs ml-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-xs text-white/40 mb-2">Uploading...</div>
      )}

      {/* Slash command autocomplete */}
      {slashHint.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg bg-ocean border border-white/10 shadow-xl overflow-hidden">
          {slashHint.map((cmd) => (
            <button
              key={cmd.name}
              onMouseDown={(e) => {
                e.preventDefault();
                setValue(cmd.name + ' ');
                inputRef.current?.focus();
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5 transition"
            >
              <span className="font-mono text-lobster-light">{cmd.name}</span>
              <span className="text-xs text-white/30">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mention autocomplete popup */}
      {mentionQuery !== null && filteredAccounts.length > 0 && slashHint.length === 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg bg-ocean border border-white/10 shadow-xl overflow-hidden">
          {filteredAccounts.map((a, i) => (
            <button
              key={a.id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(a);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition ${
                i === mentionIndex ? 'bg-lobster/20 text-white' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <span className="text-xs opacity-60">
                {a.accountType === 'agent' || a.accountType === 'sub_agent' ? '🤖' : '👤'}
              </span>
              <span className="font-medium">{a.displayName}</span>
              <span className="text-xs text-white/30 ml-auto">{a.accountType}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg p-2 text-white/30 hover:text-white/60 hover:bg-white/5 transition disabled:opacity-50"
          title="Attach file"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={dragOver ? 'Drop files here...' : 'Type a message... Use @ to mention'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || uploading || (!value.trim() && pendingFiles.length === 0)}
          className="rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
