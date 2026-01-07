import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config, validateConfig } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { logger } from './utils/logger.js';
import { authMiddleware } from './api/middlewares/auth.middleware.js';
import { searchRoutes } from './api/routes/search.routes.js';
import { healthRoutes } from './api/routes/health.routes.js';
import type { ErrorResponse } from './types/index.js';

// Validate configuration on startup
validateConfig();

const fastify = Fastify({
  logger: false, // We use custom pino logger
});

// Register plugins
await fastify.register(cors, {
  origin: true,
});

await fastify.register(rateLimit, {
  max: config.rateLimit.max,
  timeWindow: config.rateLimit.windowMs,
  errorResponseBuilder: () => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Limit: ${config.rateLimit.max} per ${config.rateLimit.windowMs / 1000}s`,
      },
    };
    return errorResponse;
  },
});

await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Perplexity Product Search API',
      description: 'API REST para busca de produtos utilizando Perplexity AI',
      version: '1.0.0',
    },
    servers: [
      { url: `http://localhost:${config.server.port}`, description: 'Development' },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: config.security.apiKeyHeader,
          in: 'header',
        },
      },
    },
    security: [{ apiKey: [] }],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
});

// Static files (frontend)
await fastify.register(fastifyStatic, {
  root: join(__dirname, 'public'),
  prefix: '/',
});

// Auth middleware
fastify.addHook('preHandler', authMiddleware);

// Register routes
await fastify.register(searchRoutes, { prefix: '/api/v1' });
await fastify.register(healthRoutes, { prefix: '/api/v1' });

// Global error handler
fastify.setErrorHandler((error, _request, reply) => {
  logger.error({ error: error.message, stack: error.stack }, 'Unhandled error');
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.server.env === 'development' ? error.message : 'Internal server error',
    },
  };
  
  reply.status(500).send(errorResponse);
});

// Start server
const start = async () => {
  try {
    const address = await fastify.listen({
      port: config.server.port,
      host: '0.0.0.0',
    });
    
    logger.info(`?? Server running at ${address}`);
    logger.info(`?? Documentation at ${address}/docs`);
    logger.info(`?? Using model: ${config.perplexity.model}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
};

start();
