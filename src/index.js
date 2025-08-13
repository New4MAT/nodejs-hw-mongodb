import { config } from 'dotenv';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env', debug: true });

// Шлях до .env файлу (абсолютний)
const envPath = path.resolve(process.cwd(), '.env');

// Завантаження з debug-логом
config({ path: envPath, debug: true });

console.log('Перевірка змінних оточення:');
console.log('SMTP_HOST:', process.env.SMTP_HOST ? 'Завантажено' : 'Відсутній');
console.log('Шлях до .env:', envPath);
console.log('Loaded SMTP_HOST:', process.env.SMTP_HOST);
console.log('All env vars:', process.env);

import { initMongoConnection } from './db/initMongoConnection.js';
import { setupServer } from './server.js';
import pino from 'pino';
import mongoose from 'mongoose';

const logger = pino();

const requiredEnvVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_USER',
  'MONGODB_PASSWORD',
  'MONGODB_URL',
  'MONGODB_DB',
  'CLIENT_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'JWT_SECRET',
  'APP_DOMAIN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
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

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

start();
