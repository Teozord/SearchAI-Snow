export interface LlmSearchParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  /** Optional override for the underlying model, e.g. "gemini-2.5-pro" */
  modelOverride?: string;
}

export interface LlmSearchResult {
  content: string;
  model: string;
  tokensUsed: number;
  images?: string[];
  citations?: string[];
}
