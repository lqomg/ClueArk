import { RetryableIntelError } from './retryable-intel.error';

/** LLM 瞬时失败：供 BullMQ / 上游重试（作者路径与旧 gate 共用）。 */
export class RetryableLlmGateError extends RetryableIntelError {
  constructor(message: string) {
    super(message, 'llm');
    this.name = 'RetryableLlmGateError';
  }
}
