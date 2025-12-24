import type { LLMProvider } from '@geo/shared-types';

export interface ProviderConfig {
  url: string;
  apiKey?: string;
}

export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  switch (provider) {
    case 'openai':
      return { url: 'https://api.openai.com/v1/chat/completions', apiKey: Bun.env.OPENAI_API_KEY };
    case 'deepseek':
      return { url: 'https://api.deepseek.com/chat/completions', apiKey: Bun.env.DEEPSEEK_API_KEY };
    case 'qwen':
      return { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', apiKey: Bun.env.QWEN_API_KEY };
    case 'grok':
      return { url: 'https://api.x.ai/v1/chat/completions', apiKey: Bun.env.GROK_API_KEY };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

