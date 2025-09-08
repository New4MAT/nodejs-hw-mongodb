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

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
    },
  },
});

// Перевірка обов'язкових змінних оточення
const requiredEnvVars = [
  'MONGODB_USER',
  'MONGODB_PASSWORD',
  'MONGODB_URL',
  'MONGODB_DB',
  'JWT_ACCESS_SECRET',
  'CLIENT_URL',
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  logger.error(
    `Missing required environment variables: ${missingVars.join(', ')}`,
  );
  process.exit(1);
}

export const setupServer = async () => {
  const app = express();

  // Підключення до MongoDB
  const connectToDatabase = async () => {
    try {
      await mongoose.connect(
        `mongodb+srv://${process.env.MONGODB_USER}:${encodeURIComponent(
          process.env.MONGODB_PASSWORD,
        )}@${process.env.MONGODB_URL}/${
          process.env.MONGODB_DB
        }?retryWrites=true&w=majority`,
        {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 30000,
          maxPoolSize: 10,
        },
      );
      logger.info('✅ Database connected successfully');

      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
    } catch (err) {
      logger.error(`❌ Database connection failed: ${err.message}`);
      process.exit(1);
    }
  };

  await connectToDatabase();

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

  // Логування запитів
  app.use((req, res, next) => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
    next();
  });

  // Маршрути
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

  // Обробники помилок
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

  // Обробка завершення роботи
  const gracefulShutdown = () => {
    server.close(async () => {
      logger.info('Server closed');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Обробка необроблених помилок
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  return server;
};
