import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLM_CHAT } from './llm.tokens';
import { DeepseekChatProvider } from './deepseek-chat.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    DeepseekChatProvider,
    { provide: LLM_CHAT, useExisting: DeepseekChatProvider },
  ],
  exports: [LLM_CHAT],
})
export class LlmModule {}
