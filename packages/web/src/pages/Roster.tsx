import { useRoster } from '@/api/hooks';
import { FleetGroup } from '@/components/FleetGroup';
import { AgentCard } from '@/components/AgentCard';

export function Roster() {
  const { data: roster, isLoading } = useRoster();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-white/40 text-sm">Loading roster...</div>
      </div>
    );
  }

  if (!roster?.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2 opacity-40">👥</div>
          <p className="text-white/40 text-sm">No accounts yet.</p>
        </div>
      </div>
    );
  }

  // Separate humans (fleet owners) from standalone agents
  const humans = roster.filter((r) => r.accountType === 'human');
  const standaloneAgents = roster.filter(
    (r) => r.accountType === 'agent' && (!r.children || r.children.length === 0),
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Agent Roster</h1>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-ok" /> Active
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-warn" /> Frozen
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-danger" /> Deactivated
            </span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Fleet groups (humans with their child agents) */}
          {humans.map((human) => (
            <FleetGroup key={human.id} parent={human} />
          ))}

          {/* Standalone agents without parents shown in roster */}
          {standaloneAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3">Standalone Agents</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {standaloneAgents.map((agent) => (
                  <AgentCard key={agent.id} account={agent} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
