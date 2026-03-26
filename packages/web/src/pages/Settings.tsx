import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/api/hooks';

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
        <section className="rounded-xl bg-ocean-light border border-white/5 p-5">
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
      </div>
    </div>
  );
}
