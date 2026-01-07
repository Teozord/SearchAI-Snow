import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.server.logLevel,
  transport: config.server.env === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
