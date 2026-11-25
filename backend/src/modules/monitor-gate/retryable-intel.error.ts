export type RetryableIntelKind = 'vector_missing' | 'monitor_eval' | 'llm';

export type RetryableIntelExtra = {
  failedMonitorIds?: string[];
  completedMonitorCount?: number;
  evaluatedMonitorCount?: number;
  matched?: number;
  alertsCreated?: number;
  dropped?: number;
};

/** 情报层瞬时失败：BullMQ item_ready 应重试，且不得把整条条目标成终态 failed。 */
export class RetryableIntelError extends Error {
  readonly retryable = true as const;
  readonly kind: RetryableIntelKind;
  readonly extra: RetryableIntelExtra;

  constructor(
    message: string,
    kind: RetryableIntelKind = 'llm',
    extra: RetryableIntelExtra = {},
  ) {
    super(message);
    this.name = 'RetryableIntelError';
    this.kind = kind;
    this.extra = extra;
  }
}

export function isRetryableIntelError(error: unknown): error is RetryableIntelError {
  return error instanceof RetryableIntelError;
}
