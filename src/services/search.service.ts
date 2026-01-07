import { randomUUID } from 'crypto';
import type { SearchRequest, SearchResponse, Product } from '../types/index.js';
import { buildSearchPrompt, isLikelyProductQuery } from '../utils/prompt-builder.js';
import { parseProducts } from '../utils/parser.js';
import { processProducts } from './filter.service.js';
import { resolveProductImages } from './image-resolver.service.js';
import { filterProductsByUrl } from '../utils/url-validator.js';
import { searchGemini } from './gemini.service.js';
import { searchSerpApi } from './serpapi.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export type SearchProvider = 'gemini' | 'serpapi';

export interface SearchResult {
  response: SearchResponse;
  rawContent?: string; // For debugging
}

export async function searchProducts(request: SearchRequest): Promise<SearchResult> {
  const startTime = Date.now();
  const requestId = randomUUID();
  const log = logger.child({ requestId });

  // Determine which provider to use
  const requestedProvider = (request.options as any).provider || 'gemini';
  let provider: SearchProvider = requestedProvider;
  
  // Check if SerpApi is requested but not configured
  if (provider === 'serpapi' && !config.serpapi.apiKey) {
    log.warn('SerpApi requested but SERPAPI_API_KEY not configured, falling back to Gemini');
    provider = 'gemini';
  }
  
  log.info({ query: request.query, provider }, 'Starting product search');

  // Use SerpApi for real Google Shopping data
  if (provider === 'serpapi') {
    return searchWithSerpApi(request, requestId, startTime, log);
  }

  // Default: use Gemini AI
  return searchWithGemini(request, requestId, startTime, log);
}

/**
 * Search using SerpApi (Google Shopping)
 */
async function searchWithSerpApi(
  request: SearchRequest,
  requestId: string,
  startTime: number,
  log: ReturnType<typeof logger.child>
): Promise<SearchResult> {
  const opts = request.options as any;
  
  const serpResult = await searchSerpApi({
    query: request.query,
    country: opts.serpapi_country || 'br',
    language: opts.serpapi_language || 'pt',
    minPrice: opts.serpapi_min_price,
    maxPrice: opts.serpapi_max_price,
    sortBy: opts.serpapi_sort_by,
    freeShipping: opts.serpapi_free_shipping,
    onSale: opts.serpapi_on_sale,
    num: request.options.max_results,
  });

  let products = serpResult.products;
  
  // Limit to requested max
  products = products.slice(0, request.options.max_results);

  const responseTimeMs = Date.now() - startTime;

  log.info({ productsFound: products.length, responseTimeMs }, 'SerpApi search complete');

  const response: SearchResponse = {
    success: true,
    data: {
      products,
      total_found: products.length,
      query_interpreted: `Resultados do Google Shopping para "${request.query}"`,
      images: products.map(p => p.image_url).filter((u): u is string => !!u),
    },
    meta: {
      request_id: requestId,
      response_time_ms: responseTimeMs,
      model_used: 'serpapi-google-shopping',
      search_url: serpResult.searchUrl,
    },
  };

  return { response };
}

/**
 * Search using Gemini AI
 */
async function searchWithGemini(
  request: SearchRequest,
  requestId: string,
  startTime: number,
  log: ReturnType<typeof logger.child>
): Promise<SearchResult> {
  // Check if query is likely about products
  if (!isLikelyProductQuery(request.query)) {
    log.warn('Query does not appear to be about products');
  }

  // Build prompts
  const { system, user } = buildSearchPrompt(request.query, request.options);

  // Choose Gemini model (frontend can send options.llm_model)
  const selectedModel = request.options.llm_model || config.gemini.defaultModel;

  // Call Gemini
  const llmResult = await searchGemini({
    systemPrompt: system,
    userPrompt: user,
    modelOverride: selectedModel,
  });

  log.debug({ tokensUsed: llmResult.tokensUsed, model: llmResult.model }, 'Gemini call complete');

  // Parse response JSON returned by the LLM
  const parseResult = parseProducts(llmResult.content);

  if (parseResult.parseErrors.length > 0) {
    log.warn({ errors: parseResult.parseErrors }, 'Parse errors encountered');
  }

  // Process and filter products
  let products: Product[] = [];
  if (parseResult.products.length > 0) {
    products = processProducts(parseResult.products);
    
    // Filter out products with search/category URLs
    const urlFilterResult = filterProductsByUrl(products);
    products = urlFilterResult.validProducts;
    
    if (urlFilterResult.invalidCount > 0) {
      log.info({ 
        filteredUrls: urlFilterResult.invalidUrls,
        filteredCount: urlFilterResult.invalidCount 
      }, 'Filtered products with search/category URLs');
    }
    
    // Limit to requested max
    products = products.slice(0, request.options.max_results);

    // Enrich products with resolved images from source URLs
    const resolved = await resolveProductImages(products, llmResult.images);
    products = resolved.products;

    // Merge any LLM-provided images with resolved ones (unique list)
    const fromLlm = Array.isArray(llmResult.images) ? llmResult.images : [];
    const fromProducts = products
      .map(p => p.image_url)
      .filter((url): url is string => typeof url === 'string' && url.length > 0);

    const allImages = Array.from(new Set<string>([...fromLlm, ...fromProducts]));
    llmResult.images = allImages.length > 0 ? allImages : undefined;
  }

  const responseTimeMs = Date.now() - startTime;

  log.info(
    { 
      productsFound: products.length,
      responseTimeMs 
    },
    'Gemini search complete'
  );

  const response: SearchResponse = {
    success: true,
    data: {
      products,
      total_found: products.length,
      query_interpreted: parseResult.searchSummary,
      images: llmResult.images,
      citations: llmResult.citations,
    },
    meta: {
      request_id: requestId,
      response_time_ms: responseTimeMs,
      model_used: llmResult.model,
    },
  };

  return {
    response,
    rawContent: llmResult.content,
  };
}
