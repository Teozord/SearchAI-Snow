export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    baseUrl: process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai',
    model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online',
    timeoutMs: parseInt(process.env.PERPLEXITY_TIMEOUT_MS || '30000', 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
    defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '60000', 10),
  },
  serpapi: {
    apiKey: process.env.SERPAPI_API_KEY || '',
    timeoutMs: parseInt(process.env.SERPAPI_TIMEOUT_MS || '30000', 10),
  },
  security: {
    apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',
    allowedApiKeys: (process.env.ALLOWED_API_KEYS || '').split(',').filter(Boolean),
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
} as const;

export function validateConfig(): void {
  // At least one search provider must be configured
  const hasGemini = !!config.gemini.apiKey;
  const hasSerpApi = !!config.serpapi.apiKey;
  const hasPerplexity = !!config.perplexity.apiKey;
  
  if (!hasGemini && !hasSerpApi && !hasPerplexity) {
    throw new Error('At least one API key is required: GEMINI_API_KEY, SERPAPI_API_KEY, or PERPLEXITY_API_KEY');
  }
  
  if (config.security.allowedApiKeys.length === 0) {
    throw new Error('ALLOWED_API_KEYS is required');
  }
}
