/**
 * Lobster Roll REST API client
 *
 * Thin fetch wrappers for:
 *   POST /v1/messages
 *   GET  /v1/mentions/pending
 *   POST /v1/mentions/:id/ack
 */

export interface LRMessage {
  id: string;
  channelId: string;
  workspaceId: string;
  senderId: string;
  senderDisplayName: string | null;
  content: string;
  mentions: string[];
  threadId: string | null;
  replyTo: string | null;
  attachments: unknown[];
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface LRSendMessageResult {
  message: LRMessage;
  mentionEvents: unknown[];
}

export interface LRPendingMention {
  // Fields from the raw mentionEvents DB row
  id: string;
  messageId: string;
  targetId: string;
  status: string;
  deliveredAt: string | null;
  // Enriched fields (may be absent in raw /v1/mentions/pending response)
  mentionEventId?: string;
  channelId?: string;
  message?: string;
  senderDisplayName?: string | null;
  timestamp?: string;
}

function makeHeaders(apiKey: string, workspaceId?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };
  if (workspaceId) h['X-Workspace-Id'] = workspaceId;
  return h;
}

/**
 * POST /v1/messages — send a message to a Lobster Roll channel.
 */
export async function postMessage(
  apiBase: string,
  apiKey: string,
  workspaceId: string,
  channelId: string,
  content: string,
  opts?: { threadId?: string | null; replyTo?: string | null },
): Promise<LRSendMessageResult> {
  const url = `${apiBase.replace(/\/$/, '')}/v1/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(apiKey, workspaceId),
    body: JSON.stringify({
      channelId,
      content,
      threadId: opts?.threadId ?? null,
      replyTo: opts?.replyTo ?? null,
      attachments: [],
      payload: null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LR postMessage → ${res.status}: ${text}`);
  }

  return res.json() as Promise<LRSendMessageResult>;
}

/**
 * GET /v1/mentions/pending — fetch unacknowledged mentions for this account.
 */
export async function getPendingMentions(
  apiBase: string,
  apiKey: string,
  workspaceId: string,
): Promise<LRPendingMention[]> {
  const url = `${apiBase.replace(/\/$/, '')}/v1/mentions/pending`;
  const res = await fetch(url, {
    method: 'GET',
    headers: makeHeaders(apiKey, workspaceId),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LR getPendingMentions → ${res.status}: ${text}`);
  }

  const body = (await res.json()) as { mentions?: LRPendingMention[] } | LRPendingMention[];
  return Array.isArray(body) ? body : (body.mentions ?? []);
}

/**
 * GET /v1/messages/:id — fetch a single message by ID.
 */
export async function getMessage(
  apiBase: string,
  apiKey: string,
  workspaceId: string,
  messageId: string,
): Promise<LRMessage | null> {
  const url = `${apiBase.replace(/\/$/, '')}/v1/messages/${messageId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: makeHeaders(apiKey, workspaceId),
  });
  if (!res.ok) return null;
  return res.json() as Promise<LRMessage>;
}

/**
 * POST /v1/mentions/:id/ack — acknowledge a mention so it no longer appears in pending.
 */
export async function ackMention(
  apiBase: string,
  apiKey: string,
  workspaceId: string,
  mentionId: string,
): Promise<void> {
  const url = `${apiBase.replace(/\/$/, '')}/v1/mentions/${mentionId}/ack`;
  const res = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(apiKey, workspaceId),
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    // Best-effort — ack failure shouldn't crash the plugin
    console.warn(`LR ackMention ${mentionId} → ${res.status} (ignored)`);
  }
}
