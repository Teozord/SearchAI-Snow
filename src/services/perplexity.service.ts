import axios, { AxiosError } from 'axios';
import { config } from '../config/index.js';
import type { PerplexityRequest, PerplexityResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

const perplexityClient = axios.create({
  baseURL: config.perplexity.baseUrl,
  timeout: config.perplexity.timeoutMs,
  headers: {
    'Authorization': `Bearer ${config.perplexity.apiKey}`,
    'Content-Type': 'application/json',
  },
});

export interface PerplexitySearchParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface PerplexitySearchResult {
  content: string;
  model: string;
  tokensUsed: number;
  images?: string[];
  citations?: string[];
}

export async function searchPerplexity(params: PerplexitySearchParams): Promise<PerplexitySearchResult> {
  const { systemPrompt, userPrompt, maxTokens = 4000, temperature = 0.2 } = params;

  const requestBody: PerplexityRequest = {
    model: config.perplexity.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
    return_citations: true,
    return_images: true,
    return_related_questions: true,
  };

  logger.debug({ model: requestBody.model }, 'Calling Perplexity API');

  try {
    const response = await perplexityClient.post<PerplexityResponse>(
      '/chat/completions',
      requestBody
    );

    const choice = response.data.choices[0];
    if (!choice) {
      throw new Error('No response choice from Perplexity');
    }

    logger.debug(
      { 
        tokensUsed: response.data.usage.total_tokens,
        finishReason: choice.finish_reason,
        hasImages: !!(response.data.images && response.data.images.length > 0),
        imagesCount: response.data.images?.length || 0,
        hasCitations: !!(response.data.citations && response.data.citations.length > 0),
      },
      'Perplexity response received'
    );
    
    // Log images for debugging
    if (response.data.images && response.data.images.length > 0) {
      logger.info({ images: response.data.images }, 'Images returned from Perplexity');
    } else {
      logger.warn('No images returned from Perplexity API');
    }

    // Normalize images to simple URLs
    let normalizedImages: string[] | undefined = undefined;
    if (response.data.images && response.data.images.length > 0) {
      normalizedImages = response.data.images.map((img: any) => 
        typeof img === 'string' ? img : img.image_url
      ).filter(Boolean);
      
      logger.info({ 
        originalImages: response.data.images,
        normalizedImages 
      }, 'Image normalization complete');
    }

    return {
      content: choice.message.content,
      model: response.data.model,
      tokensUsed: response.data.usage.total_tokens,
      images: normalizedImages,
      citations: response.data.citations,
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message;
      
      logger.error({ status, message }, 'Perplexity API error');
      
      if (status === 401) {
        throw new Error('Invalid Perplexity API key');
      }
      if (status === 429) {
        throw new Error('Perplexity rate limit exceeded');
      }
      throw new Error(`Perplexity API error: ${message}`);
    }
    throw err;
  }
}
