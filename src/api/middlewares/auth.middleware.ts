import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { config } from '../../config/index.js';
import type { ErrorResponse } from '../../types/index.js';

export function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  // Skip auth for public routes (health, docs, frontend)
  const publicPaths = ['/api/v1/health', '/docs', '/index.html', '/'];
  const isPublic = publicPaths.some(path => request.url === path || request.url.startsWith('/docs'));
  
  if (isPublic || !request.url.startsWith('/api/')) {
    return done();
  }

  const apiKey = request.headers[config.security.apiKeyHeader] as string | undefined;

  if (!apiKey) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API key is required',
      },
    };
    reply.status(401).send(errorResponse);
    return;
  }

  if (!config.security.allowedApiKeys.includes(apiKey)) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key',
      },
    };
    reply.status(401).send(errorResponse);
    return;
  }

  done();
}
