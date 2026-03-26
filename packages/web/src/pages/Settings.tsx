import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace, useInvitations, useCreateInvitation, useRevokeInvitation, useGenerateApiKey } from '@/api/hooks';

export function Settings() {
  const { currentAccount, workspaceId } = useAuth();
  const { data: workspace, isLoading } = useWorkspace(workspaceId ?? '');

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-white/40 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

        {/* Workspace info */}
        <section className="rounded-xl bg-ocean-light border border-white/5 p-5 mb-6">
          <h2 className="text-sm font-semibold text-white/80 mb-4">Workspace</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Name</span>
              <span className="text-white">{workspace?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Slug</span>
              <span className="text-white font-mono text-xs">{workspace?.slug ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Provisioning Mode</span>
              <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium ${
                workspace?.provisioningMode === 'open'
                  ? 'bg-status-ok/10 text-status-ok'
                  : workspace?.provisioningMode === 'supervised'
                    ? 'bg-status-warn/10 text-status-warn'
                    : 'bg-status-danger/10 text-status-danger'
              }`}>
                {workspace?.provisioningMode ?? '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Current account */}
        <section className="rounded-xl bg-ocean-light border border-white/5 p-5 mb-6">
          <h2 className="text-sm font-semibold text-white/80 mb-4">Your Account</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Display Name</span>
              <span className="text-white">{currentAccount?.displayName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Type</span>
              <span className="text-white capitalize">{currentAccount?.accountType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Status</span>
              <span className="text-white capitalize">{currentAccount?.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">ID</span>
              <span className="text-white/70 font-mono text-xs">{currentAccount?.id}</span>
            </div>
          </div>
        </section>

        {/* API Key generation */}
        <ApiKeySection />

        {/* Invite teammates (admin only) */}
        {currentAccount?.permissions?.includes('workspace:admin') && (
          <InviteSection workspaceId={workspaceId!} />
        )}
      </div>
    </div>
  );
}

function ApiKeySection() {
  const generateApiKey = useGenerateApiKey();
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      const result = await generateApiKey.mutateAsync();
      setGeneratedKey(result.apiKey);
      setCopied(false);
    } catch {
      // error shown by mutation
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="rounded-xl bg-ocean-light border border-white/5 p-5 mb-6">
      <h2 className="text-sm font-semibold text-white/80 mb-4">API Key</h2>
      <p className="text-white/50 text-sm mb-4">
        Generate an API key for programmatic access or to give to your agents.
        This will replace any existing key.
      </p>

      {generatedKey ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-ocean p-3 border border-white/10">
            <code className="text-sm text-lobster break-all">{generatedKey}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="rounded-lg bg-ocean border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <p className="text-xs text-status-warn self-center">
              Save this key now — it won't be shown again.
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generateApiKey.isPending}
          className="rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50"
        >
          {generateApiKey.isPending ? 'Generating...' : 'Generate API Key'}
        </button>
      )}
    </section>
  );
}

function InviteSection({ workspaceId }: { workspaceId: string }) {
  const { data: pending = [], isLoading } = useInvitations(workspaceId);
  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviteUrl(null);

    try {
      const result = await createInvitation.mutateAsync({ email: email.trim(), role });
      setInviteUrl(result.inviteUrl);
      setEmail('');
    } catch (err: any) {
      setError(err.message ?? 'Failed to send invitation');
    }
  };

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="rounded-xl bg-ocean-light border border-white/5 p-5 mb-6">
      <h2 className="text-sm font-semibold text-white/80 mb-4">Invite Teammates</h2>

      <form onSubmit={handleInvite} className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="flex-1 rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
          className="rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white focus:border-lobster focus:outline-none"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={createInvitation.isPending || !email.trim()}
          className="rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50"
        >
          {createInvitation.isPending ? 'Sending...' : 'Invite'}
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-status-danger">{error}</p>}

      {inviteUrl && (
        <div className="mb-4 rounded-lg bg-ocean p-3 border border-white/10">
          <p className="text-xs text-white/50 mb-1">Invite link (share with teammate):</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-lobster break-all flex-1">{inviteUrl}</code>
            <button
              onClick={handleCopyLink}
              className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Pending invitations list */}
      {isLoading ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : pending.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-white/50 mb-2">Pending invitations:</p>
          {pending.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg bg-ocean p-3 border border-white/5"
            >
              <div>
                <span className="text-sm text-white">{inv.email}</span>
                <span className="ml-2 text-xs text-white/40 capitalize">{inv.role}</span>
              </div>
              <button
                onClick={() => revokeInvitation.mutate(inv.id)}
                className="text-xs text-status-danger hover:text-status-danger/80 transition"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/40 text-sm">No pending invitations.</p>
      )}
    </section>
  );
}
