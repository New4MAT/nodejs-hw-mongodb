import { config } from 'dotenv';
config();

import { initMongoConnection } from './db/initMongoConnection.js';
import { setupServer } from './server.js';
import pino from 'pino';

const logger = pino();

const start = async () => {
  try {
    await initMongoConnection();
    await setupServer();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
};

start();
