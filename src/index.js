import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pino from 'pino';

// Імпорт роутів
import authRouter from './routes/auth.js';
import contactsRouter from './routes/contactsRoutes.js';

// Імпорт мідлварів
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

// Ініціалізація шляхів
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Завантаження змінних оточення
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Конфігурація логера
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
      ignore: 'pid,hostname',
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
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    logger.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Підключення до MongoDB
const connectDB = async () => {
  try {
    const uri = `mongodb+srv://${process.env.MONGODB_USER}:${encodeURIComponent(
      process.env.MONGODB_PASSWORD,
    )}@${process.env.MONGODB_URL}/${
      process.env.MONGODB_DB
    }?retryWrites=true&w=majority`;

    logger.info('🔗 Connecting to MongoDB...');

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
    });
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

// Ініціалізація Express додатку
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(cookieParser());
app.use(express.json());

// Логування запитів
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Підключення роутів
app.use('/auth', authRouter);
app.use('/contacts', contactsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Обробка неіснуючих маршрутів
app.use(notFoundHandler);

// Глобальний обробник помилок
app.use(errorHandler);

// Функція запуску сервера
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info('Available routes:');
      logger.info('- POST /auth/register');
      logger.info('- POST /auth/login');
      logger.info('- GET /auth/current');
      logger.info('- POST /auth/logout');
      logger.info('- POST /auth/refresh');
      logger.info('- POST /auth/send-reset-email');
      logger.info('- POST /auth/reset-pwd');
      logger.info('- GET /contacts');
      logger.info('- POST /contacts');
      logger.info('- PATCH /contacts/:id');
    });

    const gracefulShutdown = async () => {
      logger.info('🛑 Received shutdown signal, closing server...');
      server.close(async () => {
        await mongoose.connection.close();
        logger.info('✅ Server and database connections closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Запуск сервера
startServer();
