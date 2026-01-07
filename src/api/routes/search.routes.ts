import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { searchRequestSchema, type SearchRequest, type ErrorResponse } from '../../types/index.js';
import { searchProducts } from '../../services/search.service.js';
import { logger } from '../../utils/logger.js';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: SearchRequest }>(
    '/search/products',
    {
      schema: {
        description: 'Search for products using AI',
        tags: ['Search'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 3, maxLength: 500 },
            options: {
              type: 'object',
              properties: {
                max_results: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
                language: { type: 'string', enum: ['pt-BR', 'en-US'], default: 'pt-BR' },
                include_prices: { type: 'boolean', default: true },
                include_sources: { type: 'boolean', default: true },
                provider: { type: 'string', enum: ['gemini', 'serpapi'], default: 'gemini' },
                llm_model: { type: 'string' },
                serpapi_country: { type: 'string' },
                serpapi_language: { type: 'string' },
                serpapi_sort_by: { type: 'string' },
                serpapi_min_price: { type: 'number' },
                serpapi_max_price: { type: 'number' },
                serpapi_free_shipping: { type: 'boolean' },
                serpapi_on_sale: { type: 'boolean' },
              },
              additionalProperties: false,
            },
          },
        },
        response: {
          200: {
            description: 'Successful search',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  products: { type: 'array' },
                  total_found: { type: 'integer' },
                  query_interpreted: { type: 'string' },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  request_id: { type: 'string' },
                  response_time_ms: { type: 'number' },
                  model_used: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SearchRequest }>, reply: FastifyReply) => {
      // Validate with Zod
      const parseResult = searchRequestSchema.safeParse(request.body);
      
      if (!parseResult.success) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
        };
        return reply.status(400).send(errorResponse);
      }

      try {
        const result = await searchProducts(parseResult.data);
        return reply.send(result.response);
      } catch (error) {
        logger.error({ error }, 'Search failed');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isPerplexityError = errorMessage.includes('Perplexity');
        
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            code: isPerplexityError ? 'PERPLEXITY_ERROR' : 'INTERNAL_ERROR',
            message: errorMessage,
          },
        };
        
        return reply.status(isPerplexityError ? 502 : 500).send(errorResponse);
      }
    }
  );
}
