import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace, useInvitations, useCreateInvitation, useRevokeInvitation, useGenerateApiKey, useRotateProvisionToken, useUpdateWorkspaceSettings, useUpdateAvatar, useDeleteAvatar } from '@/api/hooks';
import { Avatar } from '@/components/Avatar';

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
          {currentAccount && (
            <AvatarUploadSection account={currentAccount} />
          )}
          <div className="space-y-3 mt-4">
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

        {/* Agent invite (admin only) */}
        {currentAccount?.permissions?.includes('workspace:admin') && workspace && (
          <AgentInviteSection workspace={workspace} />
        )}

        {/* Whisper settings (admin only) */}
        {currentAccount?.permissions?.includes('workspace:admin') && workspace && (
          <WhisperSection workspace={workspace} workspaceId={workspaceId!} />
        )}

        {/* Invite teammates (admin only) */}
        {currentAccount?.permissions?.includes('workspace:admin') && (
          <InviteSection workspaceId={workspaceId!} />
        )}
      </div>
    </div>
  );
}

function AvatarUploadSection({ account }: { account: import('@/types').Account }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateAvatar = useUpdateAvatar();
  const deleteAvatar = useDeleteAvatar();
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      await updateAvatar.mutateAsync({ id: account.id, formData });
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setError('');
    try {
      await deleteAvatar.mutateAsync(account.id);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Remove failed');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="relative group flex-shrink-0"
        title="Change photo"
      >
        <Avatar
          displayName={account.displayName}
          avatarUrl={account.avatarUrl}
          accountType={account.accountType}
          size="lg"
        />
        <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
          Edit
        </span>
      </button>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={updateAvatar.isPending}
          className="text-xs text-lobster-light hover:text-lobster transition disabled:opacity-50"
        >
          {updateAvatar.isPending ? 'Uploading...' : 'Change photo'}
        </button>
        {account.avatarUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={deleteAvatar.isPending}
            className="text-xs text-white/30 hover:text-status-danger transition disabled:opacity-50"
          >
            {deleteAvatar.isPending ? 'Removing...' : 'Remove'}
          </button>
        )}
        {error && <p className="text-xs text-status-danger">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
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

function AgentInviteSection({ workspace }: { workspace: import('@/types').Workspace }) {
  const rotateToken = useRotateProvisionToken();
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
  const webBase = window.location.origin;

  const oneLiner = `Read ${webBase}/agent-setup.md then POST to ${apiBase}/v1/auth/agent-join with {"provisionToken":"${workspace.agentProvisionToken}","displayName":"YOUR_AGENT_NAME"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(oneLiner);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    try {
      await rotateToken.mutateAsync(workspace.id);
      setConfirmRotate(false);
    } catch {
      // error shown by mutation
    }
  };

  return (
    <section className="rounded-xl bg-ocean-light border border-white/5 p-5 mb-6">
      <h2 className="text-sm font-semibold text-white/80 mb-4">Invite Agent</h2>
      <p className="text-white/50 text-sm mb-4">
        Copy this one-liner and paste it to any AI agent to let it self-provision into your workspace.
      </p>

      <div className="rounded-lg bg-ocean p-3 border border-white/10 mb-3">
        <code className="text-xs text-lobster break-all whitespace-pre-wrap leading-relaxed">{oneLiner}</code>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleCopy}
          className="rounded-lg bg-ocean border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Rotate provision token */}
      <div className="border-t border-white/5 pt-4">
        <p className="text-white/40 text-xs mb-2">
          Rotating the token invalidates the previous one. Existing agents are not affected.
        </p>
        {confirmRotate ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-status-warn">Are you sure?</span>
            <button
              onClick={handleRotate}
              disabled={rotateToken.isPending}
              className="rounded bg-status-danger/20 text-status-danger px-3 py-1 text-xs hover:bg-status-danger/30 transition disabled:opacity-50"
            >
              {rotateToken.isPending ? 'Rotating...' : 'Yes, rotate'}
            </button>
            <button
              onClick={() => setConfirmRotate(false)}
              className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRotate(true)}
            className="rounded bg-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/20 hover:text-white transition"
          >
            Rotate provision token
          </button>
        )}
      </div>
    </section>
  );
}

function WhisperSection({ workspace, workspaceId }: { workspace: import('@/types').Workspace; workspaceId: string }) {
  const updateSettings = useUpdateWorkspaceSettings();
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(workspace.settings?.whisperEnabled ?? false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const keyIsSet = workspace.settings?.openaiApiKeySet === true;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await updateSettings.mutateAsync({
        workspaceId,
        settings: {
          ...(apiKey ? { openaiApiKey: apiKey } : {}),
          whisperEnabled: enabled,
        },
      });
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to save');
    }
  };

  const handleClear = async () => {
    setError('');
    try {
      await updateSettings.mutateAsync({
        workspaceId,
        settings: { openaiApiKey: null, whisperEnabled: false },
      });
      setEnabled(false);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to clear');
    }
  };

  return (
    <section className="rounded-xl bg-ocean-light border border-white/5 p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-white/80">Voice Transcription</h2>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          workspace.settings?.whisperEnabled
            ? 'bg-status-ok/10 text-status-ok'
            : 'bg-white/5 text-white/30'
        }`}>
          {workspace.settings?.whisperEnabled ? 'Whisper enabled' : 'Browser STT (default)'}
        </span>
      </div>
      <p className="text-white/40 text-xs mb-4">
        By default, voice recording uses the browser's built-in speech-to-text (Chrome/Edge only, no API key needed).
        Add an OpenAI key to upgrade to Whisper — more accurate, cross-browser, and multi-language.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">OpenAI API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keyIsSet ? '••••••••  (key saved — enter new key to replace)' : 'sk-...'}
            className="w-full rounded-lg bg-ocean border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition font-mono"
          />
          {keyIsSet && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-status-ok">✓ API key saved</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-status-danger/70 hover:text-status-danger transition"
              >
                Remove key & disable Whisper
              </button>
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setEnabled((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              enabled ? 'bg-lobster' : 'bg-white/10'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
          <span className="text-sm text-white/70">Enable Whisper transcription</span>
        </label>

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateSettings.isPending || (!apiKey && !keyIsSet)}
            className="rounded-lg bg-lobster px-4 py-2 text-sm font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50"
          >
            {updateSettings.isPending ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="text-sm text-status-ok">Saved ✓</span>}
        </div>
      </form>
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
