import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { PresenceInfo, WsEvent } from '@/types';

// ── In-memory presence store (shared across components) ────────────

type Listener = () => void;

class PresenceStore {
  private map = new Map<string, PresenceInfo>();
  private listeners = new Set<Listener>();

  getSnapshot = () => this.map;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  set(accountId: string, info: PresenceInfo) {
    this.map = new Map(this.map);
    this.map.set(accountId, info);
    this.notify();
  }

  bulkSet(items: PresenceInfo[]) {
    this.map = new Map(this.map);
    for (const item of items) {
      this.map.set(item.accountId, item);
    }
    this.notify();
  }

  get(accountId: string): PresenceInfo | undefined {
    return this.map.get(accountId);
  }

  private notify() {
    for (const l of this.listeners) l();
  }
}

const store = new PresenceStore();

// ── Hook: subscribe to the presence store ──────────────────────────

export function usePresenceMap() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useAccountPresence(accountId: string): PresenceInfo | undefined {
  const map = usePresenceMap();
  return map.get(accountId);
}

// ── Hook: handle WS events for presence ────────────────────────────

export function handlePresenceEvent(event: WsEvent) {
  if (event.type === 'presence.changed') {
    store.set(event.data.accountId, event.data);
  }
}

// ── Hook: bootstrap + heartbeat ────────────────────────────────────

const HEARTBEAT_INTERVAL = 30_000; // 30s
const IDLE_TIMEOUT = 5 * 60_000; // 5min

export function usePresenceHeartbeat() {
  const { currentAccount } = useAuth();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const isIdleRef = useRef(false);

  // Bootstrap: fetch bulk presence on mount
  useEffect(() => {
    if (!currentAccount) return;
    api.get<PresenceInfo[]>('/v1/presence').then((list) => {
      store.bulkSet(list);
    }).catch(() => {
      // Silently ignore if endpoint not available yet
    });
  }, [currentAccount]);

  // Heartbeat
  useEffect(() => {
    if (!currentAccount) return;

    const sendHeartbeat = () => {
      api.post<PresenceInfo>('/v1/presence/heartbeat').catch(() => {});
    };

    // Initial heartbeat
    sendHeartbeat();

    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(heartbeatRef.current);
    };
  }, [currentAccount]);

  // Idle detection via visibilitychange
  useEffect(() => {
    if (!currentAccount) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Start idle timer
        idleTimerRef.current = setTimeout(() => {
          isIdleRef.current = true;
          api.put('/v1/presence/status', { status: 'idle' }).catch(() => {});
        }, IDLE_TIMEOUT);
      } else {
        // Cancel idle timer, go back online
        clearTimeout(idleTimerRef.current);
        if (isIdleRef.current) {
          isIdleRef.current = false;
          api.put('/v1/presence/status', { status: 'online' }).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(idleTimerRef.current);
    };
  }, [currentAccount]);
}
