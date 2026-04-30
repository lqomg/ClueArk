import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/** OpenAI 兼容 /v1/embeddings，用于标题/全文向量（相似报道聚类） */
@Injectable()
export class FeedSimEmbeddingService {
  private readonly logger = new Logger(FeedSimEmbeddingService.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('FEED_EMBEDDING_API_KEY')?.trim();
    const base = this.config.get<string>('FEED_EMBEDDING_BASE_URL')?.trim() || 'https://api.openai.com/v1';
    if (key) {
      this.client = new OpenAI({ apiKey: key, baseURL: base });
    }
  }

  isEnabled(): boolean {
    return this.client != null;
  }

  /** 批量文本 → 向量；与输入顺序一致 */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.client || texts.length === 0) return [];
    const model = this.config.get<string>('FEED_EMBEDDING_MODEL')?.trim() || 'text-embedding-3-small';
    const res = await this.client.embeddings.create({ model, input: texts });
    const sorted = [...res.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }
}
