import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { Product } from '../types/index.js';

// SerpApi Google Shopping endpoint
const SERPAPI_BASE_URL = 'https://serpapi.com/search';

export interface SerpApiOptions {
  query: string;
  country?: string;      // gl parameter (br, us, etc.)
  language?: string;     // hl parameter (pt, en, etc.)
  location?: string;     // location name
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'review';
  freeShipping?: boolean;
  onSale?: boolean;
  num?: number;          // number of results
}

export interface SerpApiProduct {
  position: number;
  title: string;
  link: string;
  product_link?: string;
  product_id?: string;
  serpapi_product_api?: string;
  source: string;
  source_icon?: string;
  price: string;
  extracted_price: number;
  old_price?: string;
  extracted_old_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail: string;
  delivery?: string;
  second_hand_condition?: string;
  extensions?: string[];
}

export interface SerpApiResponse {
  search_metadata: {
    id: string;
    status: string;
    json_endpoint: string;
    created_at: string;
    processed_at: string;
    google_shopping_url: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: string;
    q: string;
    google_domain: string;
    gl: string;
    hl: string;
  };
  search_information?: {
    shopping_results_state: string;
    query_displayed: string;
  };
  shopping_results?: SerpApiProduct[];
  error?: string;
}

/**
 * Search products using SerpApi Google Shopping
 */
export async function searchSerpApi(options: SerpApiOptions): Promise<{
  products: Product[];
  rawResults: SerpApiProduct[];
  searchUrl: string;
}> {
  const apiKey = config.serpapi?.apiKey;
  
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY is required');
  }

  // Build query parameters
  const params: Record<string, string | number> = {
    engine: 'google_shopping',
    api_key: apiKey,
    q: options.query,
    gl: options.country || 'br',
    hl: options.language || 'pt',
    num: options.num || 20,
  };


  // Optional location
  if (options.location) {
    params.location = options.location;
  }

  // Price filters (only supported in some regions)
  const supportsPriceFilters = params.gl !== 'br'; // Brazil doesn't fully support price filters
  
  if (supportsPriceFilters) {
    if (options.minPrice !== undefined) {
      params.min_price = options.minPrice;
    }
    if (options.maxPrice !== undefined) {
      params.max_price = options.maxPrice;
    }
  } else if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    logger.warn({ 
      country: params.gl,
      minPrice: options.minPrice, 
      maxPrice: options.maxPrice 
    }, 'Price filters not supported in this region, skipping');
  }

  // Sort by
  if (options.sortBy) {
    const sortMap: Record<string, number> = {
      'price_low': 1,
      'price_high': 2,
      'review': 3,
    };
    if (sortMap[options.sortBy]) {
      params.sort_by = sortMap[options.sortBy];
    }
  }

  // Filters
  if (options.freeShipping) {
    params.free_shipping = 1;
  }
  if (options.onSale) {
    params.on_sale = 1;
  }

  logger.debug({ params: { ...params, api_key: '[REDACTED]' } }, 'Calling SerpApi');

  try {
    const response = await axios.get<SerpApiResponse>(SERPAPI_BASE_URL, {
      params,
      timeout: 30000,
    });

    const data = response.data;

    if (data.error) {
      throw new Error(`SerpApi error: ${data.error}`);
    }

    const rawResults = data.shopping_results || [];
    
    logger.info({ 
      resultsCount: rawResults.length,
      searchUrl: data.search_metadata?.google_shopping_url 
    }, 'SerpApi search complete');

    // Convert to our Product format
    const products: Product[] = rawResults.map((item, index) => ({
      name: item.title,
      description: item.extensions?.join('. ') || `${item.title} - ${item.source}`,
      brand: extractBrand(item.title),
      category: 'Shopping',
      price: {
        value: item.extracted_price || 0,
        min: item.extracted_price || 0,
        max: item.extracted_old_price || item.extracted_price || 0,
        currency: options.country === 'br' ? 'BRL' : 'USD',
        formatted: item.price,
      },
      source: {
        name: item.source,
        url: item.link || item.product_link || '',
      },
      image_url: item.thumbnail,
      specs: item.extensions || [],
      rating: item.rating || null,
      availability: item.delivery || 'Verificar no site',
      relevance_score: 1 - (index * 0.05), // Decrease by position
    }));

    return {
      products,
      rawResults,
      searchUrl: data.search_metadata?.google_shopping_url || '',
    };

  } catch (err) {
    if (axios.isAxiosError(err)) {
      const message = err.response?.data?.error || err.message;
      logger.error({ status: err.response?.status, message }, 'SerpApi error');
      throw new Error(`SerpApi error: ${message}`);
    }
    throw err;
  }
}

/**
 * Extract brand from product title (heuristic)
 */
function extractBrand(title: string): string {
  const commonBrands = [
    'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Sony', 'Dell', 'HP', 'Lenovo',
    'Asus', 'Acer', 'Microsoft', 'Google', 'Nike', 'Adidas', 'JBL', 'Bose',
    'Philips', 'Panasonic', 'Canon', 'Nikon', 'Logitech', 'Razer', 'Corsair',
  ];
  
  const titleLower = title.toLowerCase();
  for (const brand of commonBrands) {
    if (titleLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  // Return first word as fallback
  return title.split(' ')[0] || 'N/A';
}

/**
 * Get available countries for Google Shopping
 */
export function getAvailableCountries(): { code: string; name: string }[] {
  return [
    { code: 'br', name: 'Brasil' },
    { code: 'us', name: 'Estados Unidos' },
    { code: 'pt', name: 'Portugal' },
    { code: 'es', name: 'Espanha' },
    { code: 'mx', name: 'México' },
    { code: 'ar', name: 'Argentina' },
    { code: 'de', name: 'Alemanha' },
    { code: 'fr', name: 'França' },
    { code: 'uk', name: 'Reino Unido' },
    { code: 'it', name: 'Itália' },
    { code: 'jp', name: 'Japão' },
    { code: 'ca', name: 'Canadá' },
  ];
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): { code: string; name: string }[] {
  return [
    { code: 'pt', name: 'Português' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'ja', name: '日本語' },
  ];
}
