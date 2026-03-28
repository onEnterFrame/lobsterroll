export interface AgentCapability {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  tags: string[];
  createdAt: string;
}
