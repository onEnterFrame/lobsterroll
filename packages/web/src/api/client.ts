const API_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── API Key auth (legacy / agent path) ────────────────────────────

function getApiKey(): string | null {
  return localStorage.getItem('lr_api_key');
}

export function setApiKey(key: string) {
  localStorage.setItem('lr_api_key', key);
}

export function clearApiKey() {
  localStorage.removeItem('lr_api_key');
}

export function hasApiKey(): boolean {
  return !!localStorage.getItem('lr_api_key');
}

// ─── Bearer token auth (Supabase JWT path) ─────────────────────────

let authToken: string | null = null;
let selectedWorkspaceId: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setSelectedWorkspaceId(id: string | null) {
  selectedWorkspaceId = id;
  if (id) {
    localStorage.setItem('lr_workspace_id', id);
  } else {
    localStorage.removeItem('lr_workspace_id');
  }
}

export function getSelectedWorkspaceId(): string | null {
  return selectedWorkspaceId ?? localStorage.getItem('lr_workspace_id');
}

// ─── Core request function ──────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  } else if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    const wsId = getSelectedWorkspaceId();
    if (wsId) {
      headers['X-Workspace-Id'] = wsId;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText }));
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * Upload a file (multipart/form-data) with proper auth headers.
 * Does NOT set Content-Type — lets the browser set it including the boundary.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {};

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  } else if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    const wsId = getSelectedWorkspaceId();
    if (wsId) headers['X-Workspace-Id'] = wsId;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText }));
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? res.statusText);
  }

  return res.json();
}

// ─── WebSocket connection ───────────────────────────────────────────

export function createWsConnection(onEvent: (event: unknown) => void): WebSocket | null {
  const apiKey = getApiKey();
  const token = apiKey ?? authToken;
  if (!token) return null;

  const wsBase = API_URL
    ? API_URL.replace(/^http/, 'ws')
    : `ws://${window.location.host}`;

  const ws = new WebSocket(`${wsBase}/ws/events?token=${encodeURIComponent(token)}`);

  ws.onmessage = (e) => {
    try {
      const raw = JSON.parse(e.data);
      // Server sends { event, data, timestamp } — normalize to { type, data } for frontend WsEvent
      const normalized =
        raw && typeof raw === 'object' && 'event' in raw && !('type' in raw)
          ? { type: raw.event, data: raw.data, timestamp: raw.timestamp }
          : raw;
      onEvent(normalized);
    } catch {
      // ignore parse errors
    }
  };

  let pingInterval: ReturnType<typeof setInterval>;
  ws.onopen = () => {
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);
  };

  ws.onclose = () => clearInterval(pingInterval);

  return ws;
}
