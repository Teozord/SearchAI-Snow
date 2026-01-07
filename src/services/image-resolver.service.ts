import axios from 'axios';

import type { Product } from '../types/index.js';
import { logger } from '../utils/logger.js';

const imageCache = new Map<string, string | null>();

interface ResolveResult {
  products: Product[];
  images: string[];
}

export async function resolveProductImages(
  products: Product[],
  existingImages?: string[]
): Promise<ResolveResult> {
  const log = logger.child({ module: 'image-resolver' });

  const allImages: string[] = Array.isArray(existingImages)
    ? [...existingImages]
    : [];

  // Resolve at most a few products to avoid excessive external calls
  const maxToResolve = 5;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    if (i >= maxToResolve) {
      break;
    }

    let finalImage = product.image_url;

    if (!finalImage && product.source?.url) {
      const sourceUrl = product.source.url;

      // Cache by source URL to avoid repeated fetches
      if (imageCache.has(sourceUrl)) {
        const cached = imageCache.get(sourceUrl);
        finalImage = cached ?? undefined;
      } else {
        try {
          const html = await fetchHtml(sourceUrl);
          const resolved = extractImageFromHtml(html, sourceUrl);
          imageCache.set(sourceUrl, resolved);
          finalImage = resolved ?? undefined;
        } catch (err) {
          log.warn({ err, sourceUrl }, 'Failed to resolve image from source URL');
          imageCache.set(sourceUrl, null);
        }
      }
    }

    if (finalImage) {
      product.image_url = finalImage;
      if (!allImages.includes(finalImage)) {
        allImages.push(finalImage);
      }
    }
  }

  return { products, images: allImages };
}

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: 5000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': 'PerplexityProductSearchBot/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  return response.data;
}

function extractImageFromHtml(html: string, baseUrl: string): string | null {
  // Prefer Open Graph image
  let candidate = extractMetaContent(html, 'property', 'og:image');

  // Fallback to Twitter image
  if (!candidate) {
    candidate = extractMetaContent(html, 'name', 'twitter:image');
  }

  // Fallback to JSON-LD (schema.org)
  if (!candidate) {
    candidate = extractFromJsonLd(html);
  }

  if (!candidate) {
    return null;
  }

  return toAbsoluteUrl(candidate, baseUrl);
}

function extractMetaContent(
  html: string,
  attr: 'property' | 'name',
  value: string
): string | null {
  const regex = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );

  const regexAlt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["'][^>]*>`,
    'i'
  );

  const match = html.match(regex) || html.match(regexAlt);
  return match?.[1] ?? null;
}

function extractFromJsonLd(html: string): string | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonText = match[1].trim();
    try {
      const data = JSON.parse(jsonText);
      const image = extractImageFromJsonLdObject(data);
      if (image) return image;
    } catch {
      // ignore invalid JSON blocks
    }
  }

  return null;
}

function extractImageFromJsonLdObject(node: any): string | null {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const img = extractImageFromJsonLdObject(item);
      if (img) return img;
    }
    return null;
  }

  if (typeof node === 'object') {
    // Direct image field
    if (typeof node.image === 'string') return node.image;

    if (Array.isArray(node.image)) {
      const first = node.image[0];
      if (typeof first === 'string') return first;
      if (first && typeof first.url === 'string') return first.url;
    }

    // Common schema.org patterns
    if (node.offers?.image) {
      const offersImage = node.offers.image;
      if (typeof offersImage === 'string') return offersImage;
      if (Array.isArray(offersImage) && typeof offersImage[0] === 'string') return offersImage[0];
    }
  }

  return null;
}

function toAbsoluteUrl(src: string, base: string): string {
  try {
    // Already absolute
    return new URL(src).toString();
  } catch {
    try {
      return new URL(src, base).toString();
    } catch {
      return src;
    }
  }
}
