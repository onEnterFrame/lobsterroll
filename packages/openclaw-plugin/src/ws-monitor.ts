/**
 * WebSocket monitor for Lobster Roll's real-time event stream.
 *
 * Connects to GET /ws/events?token=<apiKey> and dispatches inbound events.
 * Reconnects with exponential backoff (1s → 2s → 4s → 8s → 30s max).
 * Respects the provided AbortSignal — tears down cleanly on abort.
 */

/** Raw WS event shape from Lobster Roll */
export interface LRRawEvent {
  event: string;
  data: unknown;
  timestamp?: string;
}

/** Normalised event passed to the handler */
export interface LREvent {
  type: string;
  data: unknown;
}

export interface WsMonitorOptions {
  apiBase: string;
  apiKey: string;
  abortSignal?: AbortSignal;
  onEvent: (event: LREvent) => void | Promise<void>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  /** Called when WS opens — provides sendTyping helpers for the active connection. */
  onHandle?: (handle: { sendTypingStart: (channelId: string) => void; sendTypingStop: (channelId: string) => void }) => void;
  log?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

/**
 * Start the WS monitor. Returns a Promise that resolves when the connection
 * has been fully torn down (via abort or permanent failure).
 */
export async function startWsMonitor(opts: WsMonitorOptions): Promise<void> {
  const { apiBase, apiKey, abortSignal, onEvent, onConnected, onDisconnected, log } = opts;

  // Build the WS URL: swap http/https scheme to ws/wss
  const wsBase = apiBase.replace(/^https?/, (s) => (s === 'https' ? 'wss' : 'ws'));
  const wsUrl = `${wsBase.replace(/\/$/, '')}/ws/events?token=${encodeURIComponent(apiKey)}`;

  return new Promise<void>((resolve) => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = BACKOFF_INITIAL_MS;
    let stopped = false;

    function teardown() {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        try { ws.close(); } catch { /* ignore */ }
        ws = null;
      }
      onDisconnected?.();
      resolve();
    }

    abortSignal?.addEventListener('abort', teardown, { once: true });

    function connect() {
      if (stopped) return;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      log?.info(`lobsterroll: WS connecting to ${wsUrl}`);

      // Prefer native globalThis.WebSocket (Node 21+, browsers).
      // Falls back to dynamic import of the `ws` package when unavailable.
      const WsClass: typeof WebSocket =
        typeof globalThis.WebSocket !== 'undefined'
          ? globalThis.WebSocket
          : (() => { throw new Error('WebSocket not available — install the `ws` package'); })();

      ws = new WsClass(wsUrl);

      let pingInterval: ReturnType<typeof setInterval> | null = null;

      ws.addEventListener('open', () => {
        log?.info('lobsterroll: WS connected');
        reconnectDelay = BACKOFF_INITIAL_MS;
        onConnected?.();

        // Expose typing helpers on the active connection
        opts.onHandle?.({
          sendTypingStart: (channelId: string) => {
            if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'typing.start', channelId }));
          },
          sendTypingStop: (channelId: string) => {
            if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'typing.stop', channelId }));
          },
        });

        // Keep-alive ping every 30 s
        pingInterval = setInterval(() => {
          if (ws?.readyState === 1 /* OPEN */) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30_000);
      });

      ws.addEventListener('message', (evt) => {
        let raw: LRRawEvent;
        try {
          const text = typeof evt.data === 'string' ? evt.data : String(evt.data);
          raw = JSON.parse(text) as LRRawEvent;
        } catch {
          return; // ignore malformed frames
        }

        const normalized: LREvent = {
          type: raw.event ?? (raw as unknown as Record<string, unknown>)['type'] as string ?? 'unknown',
          data: raw.data ?? raw,
        };

        Promise.resolve(onEvent(normalized)).catch((err: unknown) =>
          log?.error(`lobsterroll: onEvent error — ${(err as Error)?.message ?? String(err)}`),
        );
      });

      ws.addEventListener('close', (evt) => {
        if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
        ws = null;
        if (stopped) return;

        log?.info(`lobsterroll: WS closed (code=${evt.code}), reconnecting in ${reconnectDelay}ms`);
        onDisconnected?.();

        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, BACKOFF_MAX_MS);
          connect();
        }, reconnectDelay);
      });

      ws.addEventListener('error', (err) => {
        log?.warn(`lobsterroll: WS error — ${(err as ErrorEvent)?.message ?? 'unknown'}`);
        // 'close' will fire next and trigger reconnect
      });
    }

    connect();
  });
}
