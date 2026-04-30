import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { LlmChatPort } from './llm.types';
import { parseJsonContent } from './llm-json.util';

/** DeepSeek 使用 OpenAI 兼容 HTTP API，后续可新增 OpenAI/Anthropic 等 Provider 并实现同一 Port */
@Injectable()
export class DeepseekChatProvider implements LlmChatPort {
  constructor(private readonly config: ConfigService) {}

  async completeJson<T>(system: string, user: string): Promise<T> {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY')?.trim();
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置');

    const baseURL = this.config.get<string>('DEEPSEEK_BASE_URL')?.trim() || 'https://api.deepseek.com';
    const model = this.config.get<string>('DEEPSEEK_MODEL')?.trim() || 'deepseek-chat';

    const client = new OpenAI({ baseURL, apiKey });
    const res = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    });
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('LLM 返回空内容');
    return parseJsonContent(text) as T;
  }
}
