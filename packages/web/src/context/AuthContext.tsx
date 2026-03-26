import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setApiKey, clearApiKey, hasApiKey } from '@/api/client';
import type { Account, RosterEntry } from '@/types';

interface AuthState {
  apiKey: string | null;
  currentAccount: Account | null;
  workspaceId: string | null;
  roster: RosterEntry[];
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (key: string) => Promise<void>;
  logout: () => void;
  refreshRoster: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    apiKey: hasApiKey() ? 'stored' : null,
    currentAccount: null,
    workspaceId: null,
    roster: [],
    isLoading: hasApiKey(),
  });

  const fetchRoster = useCallback(async () => {
    try {
      const roster = await api.get<RosterEntry[]>('/v1/roster');
      // The roster endpoint returns accounts — the first human account
      // with our API key is the current user. We find it by checking
      // all accounts. The API key auth resolved to a specific account,
      // so the roster call succeeding means we're authenticated.
      // We'll identify current account from the response.
      const allAccounts = roster.flatMap((r) => [r, ...(r.children ?? [])]);
      // The current account is whichever one the API resolved to.
      // Since we don't have that info directly from roster, we'll
      // call a workspace endpoint. For now, use the first human.
      const current = allAccounts.find((a) => a.accountType === 'human') ?? allAccounts[0];

      setState((s) => ({
        ...s,
        currentAccount: current ?? null,
        workspaceId: current?.workspaceId ?? null,
        roster,
        isLoading: false,
      }));
    } catch {
      setState((s) => ({
        ...s,
        apiKey: null,
        currentAccount: null,
        workspaceId: null,
        roster: [],
        isLoading: false,
      }));
      clearApiKey();
    }
  }, []);

  useEffect(() => {
    if (hasApiKey()) {
      fetchRoster();
    }
  }, [fetchRoster]);

  const login = useCallback(
    async (key: string) => {
      setApiKey(key);
      setState((s) => ({ ...s, apiKey: key, isLoading: true }));
      await fetchRoster();
    },
    [fetchRoster],
  );

  const logout = useCallback(() => {
    clearApiKey();
    setState({
      apiKey: null,
      currentAccount: null,
      workspaceId: null,
      roster: [],
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, refreshRoster: fetchRoster }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
