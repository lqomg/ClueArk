/** OpenAI 兼容 Chat Completions 抽象，便于切换 DeepSeek / OpenAI / 其他厂商 */
export interface LlmChatPort {
  /** 要求模型输出合法 JSON，解析后返回 */
  completeJson<T>(system: string, user: string): Promise<T>;
}
