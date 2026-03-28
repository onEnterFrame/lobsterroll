import type { WebSocket } from 'ws';

export class ConnectionManager {
  private connections = new Map<string, Set<WebSocket>>();

  add(accountId: string, ws: WebSocket) {
    if (!this.connections.has(accountId)) {
      this.connections.set(accountId, new Set());
    }
    this.connections.get(accountId)!.add(ws);
  }

  remove(accountId: string, ws: WebSocket) {
    const sockets = this.connections.get(accountId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.connections.delete(accountId);
      }
    }
  }

  send(accountId: string, event: string, data: unknown) {
    const sockets = this.connections.get(accountId);
    if (!sockets) return;

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }

  broadcast(event: string, data: unknown, accountIds?: string[]) {
    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    const targets = accountIds
      ? accountIds.flatMap((id) => [...(this.connections.get(id) ?? [])])
      : [...this.connections.values()].flatMap((set) => [...set]);

    for (const ws of targets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }

  hasConnections(accountId: string): boolean {
    const sockets = this.connections.get(accountId);
    return !!sockets && sockets.size > 0;
  }

  getConnectedCount(): number {
    return this.connections.size;
  }
}

// Singleton for Phase 1 (single-server)
export const connectionManager = new ConnectionManager();
