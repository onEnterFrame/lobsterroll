import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Account,
  Approval,
  Channel,
  Invitation,
  Message,
  MentionEvent,
  RosterEntry,
  Workspace,
} from '@/types';

// ─── Roster / Auth validation ──────────────────────────────────────

export function useRoster() {
  return useQuery<RosterEntry[]>({
    queryKey: ['roster'],
    queryFn: () => api.get('/v1/roster'),
  });
}

// ─── Workspace ─────────────────────────────────────────────────────

export function useWorkspace(id: string) {
  return useQuery<Workspace>({
    queryKey: ['workspace', id],
    queryFn: () => api.get(`/v1/workspaces/${id}`),
    enabled: !!id,
  });
}

// ─── Channels ──────────────────────────────────────────────────────

export function useChannels() {
  return useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: () => api.get('/v1/channels'),
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; channelType?: string; visibility?: string; topic?: string }) =>
      api.post<Channel>('/v1/channels', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });
}

export function useSubscribeChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, accountIds }: { channelId: string; accountIds: string[] }) =>
      api.post(`/v1/channels/${channelId}/subscribe`, { accountIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });
}

// ─── Messages ──────────────────────────────────────────────────────

export function useMessages(channelId: string, cursor?: string) {
  return useQuery<{ messages: Message[]; nextCursor: string | null }>({
    queryKey: ['messages', channelId, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ channelId });
      if (cursor) params.set('cursor', cursor);
      return api.get(`/v1/messages?${params}`);
    },
    enabled: !!channelId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { channelId: string; content: string }) =>
      api.post<{ message: Message; mentionEvents: MentionEvent[] }>('/v1/messages', data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['messages', vars.channelId] });
    },
  });
}

// ─── Mentions ──────────────────────────────────────────────────────

export function usePendingMentions() {
  return useQuery<MentionEvent[]>({
    queryKey: ['mentions', 'pending'],
    queryFn: () => api.get('/v1/mentions/pending'),
  });
}

export function useAckMention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mentionId: string) => api.post(`/v1/mentions/${mentionId}/ack`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentions'] }),
  });
}

// ─── Accounts ──────────────────────────────────────────────────────

export function useAccount(id: string) {
  return useQuery<Account>({
    queryKey: ['account', id],
    queryFn: () => api.get(`/v1/accounts/${id}`),
    enabled: !!id,
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; displayName?: string }) =>
      api.patch<Account>(`/v1/accounts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}

// ─── Approvals ─────────────────────────────────────────────────────

export function usePendingApprovals() {
  return useQuery<Approval[]>({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.get('/v1/approvals/pending'),
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'denied' }) =>
      api.post(`/v1/approvals/${id}/decide`, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

// ─── Invitations ───────────────────────────────────────────────────

export function useInvitations(workspaceId: string) {
  return useQuery<Invitation[]>({
    queryKey: ['invitations', workspaceId],
    queryFn: () => api.get('/v1/invitations'),
    enabled: !!workspaceId,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: 'member' | 'admin' }) =>
      api.post<{ invitation: Invitation; inviteUrl: string }>('/v1/invitations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/invitations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  });
}

// ─── API Key ───────────────────────────────────────────────────────

export function useGenerateApiKey() {
  return useMutation({
    mutationFn: () => api.post<{ apiKey: string }>('/v1/auth/generate-api-key'),
  });
}

// ─── Agent Provision Token ────────────────────────────────────────

export function useRotateProvisionToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) =>
      api.post<{ agentProvisionToken: string }>(
        `/v1/workspaces/${workspaceId}/rotate-provision-token`,
      ),
    onSuccess: (_data, workspaceId) =>
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId] }),
  });
}
