export const CALLBACK_METHODS = ['webhook', 'websocket', 'poll'] as const;
export type CallbackMethod = (typeof CALLBACK_METHODS)[number];

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

export interface AgentCallback {
  accountId: string;
  method: CallbackMethod;
  config: WebhookConfig | Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
