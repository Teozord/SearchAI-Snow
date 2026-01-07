import type { Product } from '../types/index.js';
import { logger } from './logger.js';

// Patterns that indicate a search/category page (NOT a product page)
const SEARCH_URL_PATTERNS = [
  /\/busca\//i,
  /\/search/i,
  /\/s\?/i,
  /\/s\//i,
  /[?&]q=/i,
  /[?&]query=/i,
  /[?&]search=/i,
  /[?&]s=/i,
  /[?&]k=/i,
  /\/categoria\//i,
  /\/category\//i,
  /\/browse\//i,
  /\/results\//i,
  /\/produtos\?/i,
  /\/products\?/i,
  /\/lista\//i,
  /\/list\//i,
  /\/catalogo\//i,
  /\/catalog\//i,
  /\/departamento\//i,
  /\/department\//i,
];

// Patterns that indicate a valid product page
const PRODUCT_URL_PATTERNS = [
  /\/dp\/[A-Z0-9]+/i,           // Amazon: /dp/B0BN72DG3G
  /\/produto\/\d+/i,            // Kabum, etc: /produto/123456
  /\/p\/\d+/i,                  // Magazine Luiza: /p/236528700
  /\/product\/\d+/i,            // Generic: /product/123
  /\/MLB-?\d+/i,                // Mercado Livre: MLB-12345678 or MLB12345678
  /\/item\/\d+/i,               // Generic: /item/123
  /\/sku\/\d+/i,                // Generic: /sku/123
  /\/id\/\d+/i,                 // Generic: /id/123
  /\/pd\/\d+/i,                 // Ponto/Casas Bahia: /pd/123
  /\d{6,}/,                     // Any URL with 6+ digit product ID
];

/**
 * Check if a URL looks like a search/category page
 */
export function isSearchUrl(url: string): boolean {
  if (!url) return true;
  
  try {
    const urlObj = new URL(url);
    const fullUrl = urlObj.href.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const search = urlObj.search.toLowerCase();
    
    // Check for search patterns
    for (const pattern of SEARCH_URL_PATTERNS) {
      if (pattern.test(fullUrl) || pattern.test(pathname) || pattern.test(search)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return true; // Invalid URL = treat as search
  }
}

/**
 * Check if a URL looks like a valid product page
 */
export function isProductUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const fullUrl = urlObj.href;
    const pathname = urlObj.pathname;
    
    // First check it's not a search URL
    if (isSearchUrl(url)) {
      return false;
    }
    
    // Check for product patterns
    for (const pattern of PRODUCT_URL_PATTERNS) {
      if (pattern.test(fullUrl) || pattern.test(pathname)) {
        return true;
      }
    }
    
    // If no explicit product pattern, check if it has a reasonable path depth
    // (product pages usually have 2+ path segments)
    const pathSegments = pathname.split('/').filter(s => s.length > 0);
    if (pathSegments.length >= 2) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Filter products to keep only those with valid product URLs
 * Returns filtered products and count of removed items
 */
export function filterProductsByUrl(products: Product[]): { 
  validProducts: Product[]; 
  invalidCount: number;
  invalidUrls: string[];
} {
  const validProducts: Product[] = [];
  const invalidUrls: string[] = [];
  
  for (const product of products) {
    const url = product.source?.url;
    
    if (!url) {
      // Keep products without URL (we can try to resolve later)
      validProducts.push(product);
      continue;
    }
    
    if (isSearchUrl(url)) {
      invalidUrls.push(url);
      logger.debug({ url, productName: product.name }, 'Filtered out search URL');
      continue;
    }
    
    validProducts.push(product);
  }
  
  if (invalidUrls.length > 0) {
    logger.info({ 
      filteredCount: invalidUrls.length, 
      remainingCount: validProducts.length 
    }, 'Filtered out products with search/category URLs');
  }
  
  return {
    validProducts,
    invalidCount: invalidUrls.length,
    invalidUrls,
  };
}
