import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import contactsRouter from './routes/contactsRoutes.js';
import authRouter from './routes/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import pino from 'pino';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Current .env path:', path.join(__dirname, '.env'));

const logger = pino();

export const setupServer = () => {
  const app = express();

  // MongoDB connection
  mongoose
    .connect(
      `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DB}`,
    )
    .then(() => logger.info('Database connected'))
    .catch((err) => logger.error('Database connection error:', err));

  // Middleware
  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Request logging
  app.use((req, res, next) => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
    next();
  });

  // Routes
  app.use('/contacts', contactsRouter);
  app.use('/auth', authRouter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      env: {
        CLIENT_URL: process.env.CLIENT_URL,
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  });

  // Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info('Available routes:');
    logger.info('- POST /auth/register');
    logger.info('- POST /auth/login');
    logger.info('- POST /auth/refresh');
    logger.info('- POST /auth/logout');
    logger.info('- GET /auth/current');
    logger.info('- POST /auth/send-reset-email');
    logger.info('- POST /auth/reset-pwd');
    logger.info('- GET /contacts');
    logger.info('- POST /contacts');
    logger.info('- PATCH /contacts/:id');
  });

  return server;
};
