import { useEffect, useRef } from 'react';
import { createWsConnection } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { WsEvent } from '@/types';

type EventHandler = (event: WsEvent) => void;

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 3000;

export function useWebSocket(onEvent: EventHandler) {
  const { currentAccount } = useAuth();
  const accountId = currentAccount?.id;
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onEvent);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!accountId) return;

    let unmounted = false;
    retriesRef.current = 0;

    function connect() {
      if (unmounted) return;

      // Close existing connection cleanly
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = createWsConnection((event) => {
        handlerRef.current(event as WsEvent);
      });

      if (!ws) return;

      const originalOnOpen = ws.onopen;
      ws.onopen = (e) => {
        retriesRef.current = 0;
        if (originalOnOpen) originalOnOpen.call(ws, e);
      };

      const originalOnClose = ws.onclose;
      ws.onclose = (e) => {
        // Run original cleanup (clears ping interval)
        if (originalOnClose) originalOnClose.call(ws, e);
        wsRef.current = null;

        if (unmounted) return;

        // Don't reconnect on auth failure or if max retries exceeded
        if (e.code === 4001 || retriesRef.current >= MAX_RETRIES) return;

        retriesRef.current++;
        const delay = BASE_DELAY_MS * Math.pow(2, retriesRef.current - 1);
        timerRef.current = setTimeout(connect, delay);
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [accountId]);
}
