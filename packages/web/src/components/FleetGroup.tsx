import type { RosterEntry, Account } from '@/types';
import { AgentCard } from './AgentCard';

interface Props {
  parent: RosterEntry;
}

function AgentWithChildren({ agent }: { agent: Account & { children?: Account[] } }) {
  const subAgents = agent.children?.filter(
    (c) => c.accountType === 'agent' || c.accountType === 'sub_agent',
  ) ?? [];

  return (
    <div>
      <AgentCard account={agent} />
      {subAgents.length > 0 && (
        <div className="ml-4 mt-2 pl-3 border-l border-white/10 space-y-2">
          {subAgents.map((sub) => (
            <AgentWithChildren key={sub.id} agent={sub as Account & { children?: Account[] }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FleetGroup({ parent }: Props) {
  const agents = parent.children?.filter(
    (c) => c.accountType === 'agent' || c.accountType === 'sub_agent',
  ) ?? [];

  if (agents.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-lobster/20 flex items-center justify-center text-xs">
          👤
        </div>
        <h3 className="text-sm font-semibold text-white/80">{parent.displayName}</h3>
        <span className="text-xs text-white/30">{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentWithChildren key={agent.id} agent={agent as Account & { children?: Account[] }} />
        ))}
      </div>
    </div>
  );
}
