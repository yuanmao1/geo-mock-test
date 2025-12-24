export type GeoCopyType = 'definition' | 'problem' | 'comparison' | 'mechanism' | 'boundary';

export interface GeoGenerationRequest {
  productId: string;
  copyType: GeoCopyType;
  model: string;
  customPrompt?: string;
}

export interface GeoGenerationResponse {
  content: string;
}

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'qwen' | 'grok' | 'local';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
}

export const AVAILABLE_MODELS: LLMModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek' },
  { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'qwen' },
  { id: 'qwen-plus', name: 'Qwen Plus', provider: 'qwen' },
  { id: 'grok-1', name: 'Grok-1', provider: 'grok' },
];

export * from './mockData';
