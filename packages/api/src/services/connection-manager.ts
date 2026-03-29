import type { WebSocket } from 'ws';

export class ConnectionManager {
  private connections = new Map<string, Set<WebSocket>>();
  private workspaceConnections = new Map<string, Set<string>>(); // workspaceId → Set<accountId>
  private accountWorkspace = new Map<string, string>(); // accountId → workspaceId

  add(accountId: string, workspaceId: string, ws: WebSocket) {
    // Register socket for account
    if (!this.connections.has(accountId)) {
      this.connections.set(accountId, new Set());
    }
    this.connections.get(accountId)!.add(ws);

    // Register account → workspace mapping
    this.accountWorkspace.set(accountId, workspaceId);

    // Register account in workspace set
    if (!this.workspaceConnections.has(workspaceId)) {
      this.workspaceConnections.set(workspaceId, new Set());
    }
    this.workspaceConnections.get(workspaceId)!.add(accountId);
  }

  remove(accountId: string, ws: WebSocket) {
    const sockets = this.connections.get(accountId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.connections.delete(accountId);

        // Clean up workspace membership when last socket closes
        const workspaceId = this.accountWorkspace.get(accountId);
        if (workspaceId) {
          const workspaceAccounts = this.workspaceConnections.get(workspaceId);
          if (workspaceAccounts) {
            workspaceAccounts.delete(accountId);
            if (workspaceAccounts.size === 0) {
              this.workspaceConnections.delete(workspaceId);
            }
          }
          this.accountWorkspace.delete(accountId);
        }
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

  /**
   * Broadcast to all accounts in a specific workspace.
   * Use this for all domain events (messages, tasks, presence) to prevent cross-tenant leakage.
   */
  broadcastToWorkspace(workspaceId: string, event: string, data: unknown) {
    const accountIds = this.workspaceConnections.get(workspaceId);
    if (!accountIds || accountIds.size === 0) return;

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    for (const accountId of accountIds) {
      const sockets = this.connections.get(accountId);
      if (!sockets) continue;
      for (const ws of sockets) {
        if (ws.readyState === ws.OPEN) {
          ws.send(payload);
        }
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
