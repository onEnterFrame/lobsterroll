export const SEMANTIC_REACTIONS = {
  '✅': 'will_handle',
  '👀': 'reviewing',
  '🚫': 'blocked',
  '👍': 'agree',
  '👎': 'disagree',
  '🎯': 'priority',
  '⏳': 'in_progress',
  '🔥': 'urgent',
} as const;

export type SemanticMeaning = (typeof SEMANTIC_REACTIONS)[keyof typeof SEMANTIC_REACTIONS] | null;

export interface Reaction {
  id: string;
  messageId: string;
  accountId: string;
  emoji: string;
  semanticMeaning: string | null;
  createdAt: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  semanticMeaning: string | null;
  accountIds: string[];
}
