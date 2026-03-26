import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import { setSelectedWorkspaceId } from '@/api/client';

export function Onboarding() {
  const { supabaseUser, pendingInvitations, refreshMe, logout } = useAuth();
  const navigate = useNavigate();

  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState(supabaseUser?.email?.split('@')[0] ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const autoSlug = (name: string) => {
    setWorkspaceName(name);
    setSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.post<{ workspace: { id: string }; account: { workspaceId: string } }>(
        '/v1/auth/setup-workspace',
        { workspaceName, slug, displayName },
      );
      setSelectedWorkspaceId(result.workspace.id);
      await refreshMe();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (token: string, inviteId: string) => {
    setAcceptingId(inviteId);
    setError('');

    try {
      await api.post('/v1/auth/accept-invitation', { token });
      await refreshMe();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Failed to accept invitation');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ocean p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🦞</div>
          <h1 className="text-2xl font-bold text-white">Welcome to Lobster Roll</h1>
          <p className="text-white/50 mt-2">
            Signed in as <span className="text-white">{supabaseUser?.email}</span>
          </p>
        </div>

        {/* Pending invitations */}
        {pendingInvitations.length > 0 && (
          <section className="bg-ocean-light rounded-2xl p-6 shadow-xl border border-white/5 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg bg-ocean p-4 border border-white/5"
                >
                  <div>
                    <p className="text-white font-medium">{inv.workspace?.name ?? 'Unknown workspace'}</p>
                    <p className="text-white/50 text-sm">Role: {inv.role}</p>
                  </div>
                  <button
                    onClick={() => handleAcceptInvite(inv.token, inv.id)}
                    disabled={acceptingId === inv.id}
                    className="rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50"
                  >
                    {acceptingId === inv.id ? 'Joining...' : 'Accept'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Create workspace */}
        <form
          onSubmit={handleCreateWorkspace}
          className="bg-ocean-light rounded-2xl p-6 shadow-xl border border-white/5"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Create a Workspace</h2>

          <div className="mb-4">
            <label htmlFor="workspaceName" className="block text-sm font-medium text-white/70 mb-2">
              Workspace Name
            </label>
            <input
              id="workspaceName"
              type="text"
              value={workspaceName}
              onChange={(e) => autoSlug(e.target.value)}
              placeholder="My Team"
              autoFocus
              className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="slug" className="block text-sm font-medium text-white/70 mb-2">
              Slug
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-team"
              className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white font-mono text-sm placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="displayName" className="block text-sm font-medium text-white/70 mb-2">
              Your Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane"
              className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
            />
          </div>

          {error && <p className="mb-3 text-sm text-status-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading || !workspaceName.trim() || !slug.trim() || !displayName.trim()}
            className="w-full rounded-lg bg-lobster px-4 py-3 font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>

        <button
          onClick={logout}
          className="mt-6 w-full text-center text-sm text-white/40 hover:text-white/60 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
