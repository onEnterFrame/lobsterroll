import { useEffect, useRef, useCallback } from 'react';
import { createWsConnection } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { WsEvent } from '@/types';

type EventHandler = (event: WsEvent) => void;

export function useWebSocket(onEvent: EventHandler) {
  const { currentAccount } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = createWsConnection((event) => {
      handlerRef.current(event as WsEvent);
    });

    if (ws) {
      ws.onclose = (e) => {
        wsRef.current = null;
        // Reconnect on unexpected close (not 4001 auth failure)
        if (e.code !== 4001 && currentAccount) {
          setTimeout(connect, 3000);
        }
      };
      wsRef.current = ws;
    }
  }, [currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      connect();
    }
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [currentAccount, connect]);
}
