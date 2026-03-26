import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import {
  api,
  setApiKey,
  clearApiKey,
  hasApiKey,
  setAuthToken,
  setSelectedWorkspaceId,
  getSelectedWorkspaceId,
} from '@/api/client';
import type { Account, RosterEntry, Workspace, Invitation } from '@/types';
import type { Session } from '@supabase/supabase-js';

type AuthMode = 'loading' | 'unauthenticated' | 'needs-onboarding' | 'authenticated';

interface MeResponse {
  supabaseUser: { id: string; email: string };
  accounts: (Account & { workspace: { id: string; name: string; slug: string } })[];
  pendingInvitations: (Invitation & { workspace: { id: string; name: string; slug: string } })[];
}

interface AuthState {
  mode: AuthMode;
  apiKey: string | null;
  currentAccount: Account | null;
  workspaceId: string | null;
  roster: RosterEntry[];
  isLoading: boolean;
  // Supabase-specific
  supabaseUser: { id: string; email: string } | null;
  supabaseAccounts: MeResponse['accounts'];
  pendingInvitations: MeResponse['pendingInvitations'];
}

interface AuthContextValue extends AuthState {
  login: (key: string) => Promise<void>;
  logout: () => void;
  refreshRoster: () => Promise<void>;
  refreshMe: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    mode: 'loading',
    apiKey: hasApiKey() ? 'stored' : null,
    currentAccount: null,
    workspaceId: null,
    roster: [],
    isLoading: true,
    supabaseUser: null,
    supabaseAccounts: [],
    pendingInvitations: [],
  });

  // ─── Fetch roster (API key path) ────────────────────────────────
  const fetchRoster = useCallback(async () => {
    try {
      const roster = await api.get<RosterEntry[]>('/v1/roster');
      const allAccounts = roster.flatMap((r) => [r, ...(r.children ?? [])]);
      const current = allAccounts.find((a) => a.accountType === 'human') ?? allAccounts[0];

      setState((s) => ({
        ...s,
        mode: 'authenticated',
        currentAccount: current ?? null,
        workspaceId: current?.workspaceId ?? null,
        roster,
        isLoading: false,
      }));
    } catch {
      setState((s) => ({
        ...s,
        mode: 'unauthenticated',
        apiKey: null,
        currentAccount: null,
        workspaceId: null,
        roster: [],
        isLoading: false,
      }));
      clearApiKey();
    }
  }, []);

  // ─── Fetch /auth/me (Supabase path) ─────────────────────────────
  const fetchMe = useCallback(async () => {
    try {
      const data = await api.get<MeResponse>('/v1/auth/me');

      if (data.accounts.length === 0) {
        // No LR accounts — need onboarding
        setState((s) => ({
          ...s,
          mode: 'needs-onboarding',
          supabaseUser: data.supabaseUser,
          supabaseAccounts: [],
          pendingInvitations: data.pendingInvitations,
          isLoading: false,
        }));
        return;
      }

      // Has accounts — pick workspace
      const savedWsId = getSelectedWorkspaceId();
      const match = savedWsId
        ? data.accounts.find((a) => a.workspaceId === savedWsId)
        : data.accounts[0];
      const account = match ?? data.accounts[0];

      setSelectedWorkspaceId(account.workspaceId);

      setState((s) => ({
        ...s,
        mode: 'authenticated',
        supabaseUser: data.supabaseUser,
        supabaseAccounts: data.accounts,
        pendingInvitations: data.pendingInvitations,
        currentAccount: account,
        workspaceId: account.workspaceId,
        isLoading: false,
      }));
    } catch {
      setState((s) => ({
        ...s,
        mode: 'unauthenticated',
        isLoading: false,
      }));
    }
  }, []);

  // ─── Supabase auth listener ──────────────────────────────────────
  useEffect(() => {
    // If API key path, skip Supabase listener
    if (hasApiKey()) {
      fetchRoster();
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
        fetchMe();
      } else {
        setAuthToken(null);
        setState((s) => ({
          ...s,
          mode: 'unauthenticated',
          currentAccount: null,
          workspaceId: null,
          supabaseUser: null,
          supabaseAccounts: [],
          pendingInvitations: [],
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRoster, fetchMe]);

  // ─── API key login ───────────────────────────────────────────────
  const login = useCallback(
    async (key: string) => {
      setApiKey(key);
      setState((s) => ({ ...s, apiKey: key, isLoading: true }));
      await fetchRoster();
    },
    [fetchRoster],
  );

  // ─── Logout ──────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    clearApiKey();
    setAuthToken(null);
    setSelectedWorkspaceId(null);
    await supabase.auth.signOut();
    setState({
      mode: 'unauthenticated',
      apiKey: null,
      currentAccount: null,
      workspaceId: null,
      roster: [],
      isLoading: false,
      supabaseUser: null,
      supabaseAccounts: [],
      pendingInvitations: [],
    });
  }, []);

  // ─── Select workspace ────────────────────────────────────────────
  const selectWorkspace = useCallback(
    (wsId: string) => {
      setSelectedWorkspaceId(wsId);
      const account = state.supabaseAccounts.find((a) => a.workspaceId === wsId);
      if (account) {
        setState((s) => ({
          ...s,
          currentAccount: account,
          workspaceId: wsId,
        }));
      }
    },
    [state.supabaseAccounts],
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshRoster: fetchRoster,
        refreshMe: fetchMe,
        selectWorkspace,
      }}
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
