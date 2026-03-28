import { useState } from 'react';
import type { MessageAttachment } from '@/types';

interface Props {
  attachments: MessageAttachment[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith('image/');
}

function isAudio(mime: string) {
  return mime.startsWith('audio/');
}

function isVideo(mime: string) {
  return mime.startsWith('video/');
}

function isPdf(mime: string) {
  return mime === 'application/pdf';
}

function isCode(mime: string, filename: string) {
  const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.css', '.html', '.json', '.yaml', '.yml', '.toml', '.sql', '.sh', '.md'];
  const codeMimes = ['text/plain', 'application/json', 'text/javascript', 'text/css', 'text/html', 'text/markdown', 'application/x-yaml'];
  return codeMimes.includes(mime) || codeExts.some((ext) => filename.toLowerCase().endsWith(ext));
}

function fileIcon(mime: string, filename: string) {
  if (isImage(mime)) return '🖼️';
  if (isAudio(mime)) return '🎵';
  if (isVideo(mime)) return '🎬';
  if (isPdf(mime)) return '📄';
  if (isCode(mime, filename)) return '💻';
  return '📎';
}

function ImageAttachment({ attachment }: { attachment: MessageAttachment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="block rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition max-w-sm"
      >
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="max-h-64 object-contain"
          loading="lazy"
        />
      </button>

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
          <div className="absolute top-4 right-4 text-white/60 text-sm">
            Click anywhere to close
          </div>
        </div>
      )}
    </>
  );
}

function AudioAttachment({ attachment }: { attachment: MessageAttachment }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎵</span>
        <span className="text-xs text-white/70 font-medium truncate">{attachment.filename}</span>
        <span className="text-[10px] text-white/30 ml-auto">{formatSize(attachment.size)}</span>
      </div>
      <audio controls className="w-full h-8" preload="metadata">
        <source src={attachment.url} type={attachment.mimeType} />
      </audio>
    </div>
  );
}

function VideoAttachment({ attachment }: { attachment: MessageAttachment }) {
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 max-w-md">
      <video controls className="w-full max-h-72" preload="metadata">
        <source src={attachment.url} type={attachment.mimeType} />
      </video>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5">
        <span className="text-xs text-white/50 truncate">{attachment.filename}</span>
        <span className="text-[10px] text-white/30 ml-auto">{formatSize(attachment.size)}</span>
      </div>
    </div>
  );
}

function GenericAttachment({ attachment }: { attachment: MessageAttachment }) {
  const icon = fileIcon(attachment.mimeType, attachment.filename);

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3 max-w-sm hover:bg-white/10 hover:border-white/20 transition group"
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/80 font-medium truncate group-hover:text-white">
          {attachment.filename}
        </p>
        <p className="text-[10px] text-white/30">
          {formatSize(attachment.size)} · {attachment.mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}
        </p>
      </div>
      <span className="text-white/20 group-hover:text-white/50 text-xs">↓</span>
    </a>
  );
}

export function AttachmentRenderer({ attachments }: Props) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1.5">
      {attachments.map((attachment, i) => {
        if (isImage(attachment.mimeType)) {
          return <ImageAttachment key={i} attachment={attachment} />;
        }
        if (isAudio(attachment.mimeType)) {
          return <AudioAttachment key={i} attachment={attachment} />;
        }
        if (isVideo(attachment.mimeType)) {
          return <VideoAttachment key={i} attachment={attachment} />;
        }
        return <GenericAttachment key={i} attachment={attachment} />;
      })}
    </div>
  );
}
