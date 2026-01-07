import { z } from 'zod';
import { productSchema, type Product } from '../types/index.js';

// Schema for raw Perplexity response
const rawResponseSchema = z.object({
  products: z.array(z.any()),
  search_summary: z.string().optional(),
});

export interface ParseResult {
  products: Product[];
  searchSummary?: string;
  parseErrors: string[];
}

/**
 * Extract JSON from Perplexity response content
 * Handles cases where response may have markdown or extra text
 */
export function extractJson(content: string): string | null {
  // Try direct parse first
  try {
    JSON.parse(content);
    return content;
  } catch {
    // Continue to extraction
  }

  // Try to find JSON in markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    let jsonString = codeBlockMatch[1].trim();
    // Try to fix common JSON issues
    jsonString = fixCommonJsonIssues(jsonString);
    return jsonString;
  }

  // Try to find JSON object directly
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    let jsonString = jsonMatch[0];
    // Try to fix common JSON issues
    jsonString = fixCommonJsonIssues(jsonString);
    return jsonString;
  }

  return null;
}

/**
 * Fix common JSON formatting issues from AI responses
 */
function fixCommonJsonIssues(jsonString: string): string {
  // Remove BOM and other invisible characters
  jsonString = jsonString.replace(/^\uFEFF/, '').trim();
  
  // Remove markdown code block markers if present
  jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  
  // Remove any text before the first { or [
  const firstBrace = jsonString.indexOf('{');
  const firstBracket = jsonString.indexOf('[');
  let startIndex = -1;
  if (firstBrace >= 0 && firstBracket >= 0) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace >= 0) {
    startIndex = firstBrace;
  } else if (firstBracket >= 0) {
    startIndex = firstBracket;
  }
  if (startIndex > 0) {
    jsonString = jsonString.substring(startIndex);
  }

  // Remove trailing commas before closing brackets/braces (multiple passes)
  let prevLength = 0;
  while (prevLength !== jsonString.length) {
    prevLength = jsonString.length;
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
  }

  // Fix missing commas between array elements: }{ or }" or ]{ or ]"
  jsonString = jsonString.replace(/}(\s*){/g, '},\n{');
  jsonString = jsonString.replace(/}(\s*)"/g, '},\n"');
  jsonString = jsonString.replace(/](\s*){/g, '],\n{');
  jsonString = jsonString.replace(/](\s*)"/g, '],\n"');
  jsonString = jsonString.replace(/"(\s*){/g, '",\n{');
  jsonString = jsonString.replace(/"(\s*)\[/g, '",\n[');
  
  // Fix unescaped quotes inside strings (heuristic: look for odd patterns)
  // This is tricky, so we do a simple pass
  jsonString = jsonString.replace(/([^\\])"([^":,{}\[\]\s][^"]*[^\\])"/g, '$1"$2"');

  // Remove control characters that break JSON
  jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, (match) => {
    if (match === '\n' || match === '\r' || match === '\t') return match;
    return '';
  });

  // Try to close incomplete strings at the end
  // Count quotes (excluding escaped ones)
  const quotes = jsonString.match(/(?<!\\)"/g) || [];
  if (quotes.length % 2 !== 0) {
    // Odd number of quotes - try to close the last string
    jsonString = jsonString.replace(/("[^"]*?)$/, '$1"');
  }

  // Fix incomplete arrays/objects at the end
  const openBraces = (jsonString.match(/{/g) || []).length;
  const closeBraces = (jsonString.match(/}/g) || []).length;
  const openBrackets = (jsonString.match(/\[/g) || []).length;
  const closeBrackets = (jsonString.match(/\]/g) || []).length;

  // Remove trailing incomplete elements before closing
  jsonString = jsonString.replace(/,\s*$/, '');
  jsonString = jsonString.replace(/"[^"]*$/, '"');
  
  // Add missing closing brackets first, then braces
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    jsonString += ']';
  }
  for (let i = 0; i < openBraces - closeBraces; i++) {
    jsonString += '}';
  }

  return jsonString;
}

/**
 * Parse and validate products from Perplexity response
 */
export function parseProducts(content: string): ParseResult {
  const parseErrors: string[] = [];
  
  const jsonString = extractJson(content);
  if (!jsonString) {
    return {
      products: [],
      parseErrors: ['Could not extract JSON from response'],
    };
  }

  let rawData: unknown;
  try {
    rawData = JSON.parse(jsonString);
  } catch (e) {
    // Try a second pass of fixes
    const secondTry = fixCommonJsonIssues(jsonString);
    try {
      rawData = JSON.parse(secondTry);
    } catch (e2) {
      // Try to extract just the products array if possible
      const productsMatch = jsonString.match(/"products"\s*:\s*(\[[\s\S]*)/i);
      if (productsMatch) {
        try {
          let productsJson = productsMatch[1];
          // Find the end of the array
          let depth = 0;
          let endIndex = 0;
          for (let i = 0; i < productsJson.length; i++) {
            if (productsJson[i] === '[') depth++;
            if (productsJson[i] === ']') depth--;
            if (depth === 0) {
              endIndex = i + 1;
              break;
            }
          }
          if (endIndex > 0) {
            productsJson = productsJson.substring(0, endIndex);
          }
          productsJson = fixCommonJsonIssues(productsJson);
          const products = JSON.parse(productsJson);
          rawData = { products, search_summary: '' };
        } catch {
          return {
            products: [],
            parseErrors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`],
          };
        }
      } else {
        return {
          products: [],
          parseErrors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`],
        };
      }
    }
  }

  // Validate basic structure
  const structureResult = rawResponseSchema.safeParse(rawData);
  if (!structureResult.success) {
    return {
      products: [],
      parseErrors: ['Response does not match expected structure'],
    };
  }

  // Validate each product individually
  const validProducts: Product[] = [];
  
  for (let i = 0; i < structureResult.data.products.length; i++) {
    const rawProduct = structureResult.data.products[i];
    const productResult = productSchema.safeParse(rawProduct);
    
    if (productResult.success) {
      validProducts.push(productResult.data);
    } else {
      parseErrors.push(`Product ${i + 1} invalid: ${productResult.error.message}`);
    }
  }

  return {
    products: validProducts,
    searchSummary: structureResult.data.search_summary,
    parseErrors,
  };
}
