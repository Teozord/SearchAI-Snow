import axios, { AxiosError } from 'axios';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { LlmSearchParams, LlmSearchResult } from './llm.types.js';

// Debug: save raw responses to file
function saveRawResponse(text: string, requestId: string): void {
  try {
    const filename = join(process.cwd(), `gemini-response-${requestId}.json`);
    writeFileSync(filename, text, 'utf-8');
    logger.info({ filename }, 'Saved raw Gemini response to file');
  } catch (err) {
    logger.warn({ err }, 'Failed to save raw response');
  }
}

const geminiClient = axios.create({
  baseURL: config.gemini.baseUrl,
  timeout: config.gemini.timeoutMs,
});

export async function searchGemini(params: LlmSearchParams): Promise<LlmSearchResult> {
  // Increased maxTokens to handle longer product lists without truncation
  const { systemPrompt, userPrompt, maxTokens = 8192, temperature = 0.2, modelOverride } = params;

  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const model = modelOverride || config.gemini.defaultModel;

  const url = `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.gemini.apiKey)}`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      // Force JSON output; schema deixado para o prompt/validação do nosso lado
      responseMimeType: 'application/json',
    },
  };

  logger.debug({ model }, 'Calling Gemini API');

  try {
    const response = await geminiClient.post(url, requestBody);
    const data = response.data;

    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error('No candidate returned from Gemini');
    }

    const parts = candidate.content.parts || [];
    const text = parts
      .map((p: any) => p.text)
      .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0)
      .join('\n');

    // Log raw response for debugging
    logger.debug({ rawResponseLength: text.length, rawResponsePreview: text.substring(0, 500) }, 'Raw Gemini response');
    
    // Save to file for analysis (use timestamp as ID)
    const requestId = Date.now().toString();
    saveRawResponse(text, requestId);

    const usage = data.usageMetadata;
    const tokensUsed = usage?.totalTokenCount ?? 0;

    return {
      content: text,
      model: data.model || model,
      tokensUsed,
      images: undefined,
      citations: undefined,
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const message = (err.response?.data as any)?.error?.message || err.message;

      logger.error({ status, message }, 'Gemini API error');
      throw new Error(`Gemini API error: ${message}`);
    }

    throw err;
  }
}
