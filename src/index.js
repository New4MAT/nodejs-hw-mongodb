import { config } from 'dotenv';
config({ path: '.env' });

import { initMongoConnection } from './db/initMongoConnection.js';
import { setupServer } from './server.js';
import pino from 'pino';

const logger = pino();

const requiredEnvVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_USER',
  'MONGODB_PASSWORD',
  'MONGODB_URL',
  'MONGODB_DB',
  'CLIENT_URL',
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

const start = async () => {
  try {
    await initMongoConnection();
    setupServer();
    logger.info(`Application started on port ${process.env.PORT}`);
  } catch (error) {
    logger.error('Application startup failed:', error);
    process.exit(1);
  }
};

start();
