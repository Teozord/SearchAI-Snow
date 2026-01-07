import type { Product } from '../types/index.js';

/**
 * Calculate relevance score based on data completeness
 */
export function calculateRelevanceScore(product: Product): number {
  let score = 0.5; // Base score
  
  if (product.name && product.name.length > 5) score += 0.1;
  if (product.description && product.description.length > 20) score += 0.1;
  if (product.price?.value || product.price?.min) score += 0.15;
  if (product.source?.url) score += 0.1;
  if (product.specs && product.specs.length > 0) score += 0.05;
  
  return Math.min(score, 1);
}

/**
 * Filter out non-product items based on heuristics
 */
export function filterNonProducts(products: Product[]): Product[] {
  const nonProductPatterns = [
    /como fazer/i,
    /tutorial/i,
    /guia de/i,
    /review/i,
    /comparativo/i,
    /dicas de/i,
    /o que é/i,
    /história de/i,
  ];

  return products.filter(product => {
    const text = `${product.name} ${product.description || ''}`.toLowerCase();
    return !nonProductPatterns.some(pattern => pattern.test(text));
  });
}

/**
 * Remove duplicate products based on name similarity
 */
export function deduplicateProducts(products: Product[]): Product[] {
  const seen = new Map<string, Product>();
  
  for (const product of products) {
    const normalizedName = product.name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (!seen.has(normalizedName)) {
      seen.set(normalizedName, product);
    } else {
      // Keep the one with more complete data
      const existing = seen.get(normalizedName)!;
      if (calculateRelevanceScore(product) > calculateRelevanceScore(existing)) {
        seen.set(normalizedName, product);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Enrich products with calculated fields
 */
export function enrichProducts(products: Product[]): Product[] {
  return products.map(product => ({
    ...product,
    relevance_score: calculateRelevanceScore(product),
    price: product.price ? {
      ...product.price,
      formatted: formatPrice(product.price.value || product.price.min, product.price.currency),
    } : undefined,
  }));
}

function formatPrice(value: number | undefined, currency: string = 'BRL'): string | undefined {
  if (!value) return undefined;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Full processing pipeline
 */
export function processProducts(rawProducts: Product[]): Product[] {
  const filtered = filterNonProducts(rawProducts);
  const deduplicated = deduplicateProducts(filtered);
  const enriched = enrichProducts(deduplicated);
  
  // Sort by relevance score descending
  return enriched.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
}
