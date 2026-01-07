import { z } from 'zod';

// ============ Request Schemas ============

export const searchOptionsSchema = z.object({
  max_results: z.number().int().min(1).max(50).default(10),
  language: z.enum(['pt-BR', 'en-US']).default('pt-BR'),
  include_prices: z.boolean().default(true),
  include_sources: z.boolean().default(true),
  provider: z.enum(['gemini', 'serpapi']).default('gemini'),
  llm_model: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']).optional(),
  serpapi_country: z.string().optional(),
  serpapi_language: z.string().optional(),
  serpapi_sort_by: z.string().optional(),
  serpapi_min_price: z.number().optional(),
  serpapi_max_price: z.number().optional(),
  serpapi_free_shipping: z.boolean().optional(),
  serpapi_on_sale: z.boolean().optional(),
});

export const searchRequestSchema = z.object({
  query: z.string()
    .min(3, 'Query must be at least 3 characters')
    .max(500, 'Query must be at most 500 characters')
    .transform(s => s.trim()),
  options: searchOptionsSchema.optional().default({}),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchOptions = z.infer<typeof searchOptionsSchema>;

// ============ Product Schema ============

export const priceSchema = z.object({
  value: z.number().nonnegative().optional(),
  min: z.number().nonnegative().optional(),
  max: z.number().nonnegative().optional(),
  currency: z.enum(['BRL', 'USD']).default('BRL'),
  formatted: z.string().optional(),
});

export const sourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
});

export const productSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  price: priceSchema.optional(),
  source: sourceSchema.optional(),
  specs: z.array(z.string()).optional(),
  relevance_score: z.number().min(0).max(1).optional(),
  image_url: z.string().url().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  availability: z.string().optional(),
});

export type Product = z.infer<typeof productSchema>;
export type Price = z.infer<typeof priceSchema>;
export type Source = z.infer<typeof sourceSchema>;

// ============ Response Schemas ============

export const searchResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    products: z.array(productSchema),
    total_found: z.number().int().nonnegative(),
    query_interpreted: z.string().optional(),
    images: z.array(z.string()).optional(),
    citations: z.array(z.string()).optional(),
  }),
  meta: z.object({
    request_id: z.string().uuid(),
    response_time_ms: z.number().nonnegative(),
    model_used: z.string(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'RATE_LIMIT_EXCEEDED',
      'PERPLEXITY_ERROR',
      'PARSE_ERROR',
      'INTERNAL_ERROR',
    ]),
    message: z.string(),
    details: z.array(z.string()).optional(),
  }),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ErrorCode = ErrorResponse['error']['code'];

// ============ Perplexity API Types ============

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  return_citations?: boolean;
  return_images?: boolean;
  return_related_questions?: boolean;
  image_domain_filter?: string[];
  image_format_filter?: string[];
}

export interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  images?: Array<string | { image_url: string; origin_url?: string; height?: number; width?: number; title?: string }>;
  related_questions?: string[];
}
