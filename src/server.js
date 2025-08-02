import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import contactsRouter from './routes/contactsRoutes.js';
import authRouter from './routes/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import pino from 'pino';
import mongoose from 'mongoose';

const logger = pino();

export const setupServer = () => {
  const app = express();

  // Підключення до MongoDB
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

  // Логування запитів
  app.use((req, res, next) => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
    next();
  });

  // Маршрути (без /api префікса)
  app.use('/contacts', contactsRouter);
  app.use('/auth', authRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      env: {
        CLIENT_URL: process.env.CLIENT_URL,
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  });

  // Обробка помилок
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
    logger.info('- GET /contacts');
    logger.info('- POST /contacts');
  });

  return server;
};
