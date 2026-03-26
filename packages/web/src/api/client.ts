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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
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
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// WebSocket connection
export function createWsConnection(onEvent: (event: unknown) => void): WebSocket | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const wsBase = API_URL
    ? API_URL.replace(/^http/, 'ws')
    : `ws://${window.location.host}`;

  const ws = new WebSocket(`${wsBase}/ws/events?token=${encodeURIComponent(apiKey)}`);

  ws.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      onEvent(event);
    } catch {
      // ignore parse errors
    }
  };

  // Keepalive ping every 30s
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
