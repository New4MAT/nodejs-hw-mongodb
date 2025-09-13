import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

// Імпорт роутів
import authRouter from './routes/auth.js';
import contactsRouter from './routes/contactsRoutes.js';

// Імпорт мідлварів
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

async function createTmpDir() {
  try {
    await fs.access('tmp');
  } catch {
    await fs.mkdir('tmp', { recursive: true });
  }
}

createTmpDir().then(() => {
  console.log('Tmp directory ready');
});

// Ініціалізація шляхів
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('🔍 Current working directory:', process.cwd());
console.log('🔍 __dirname:', __dirname);

// Завантаження змінних оточення
dotenv.config({ path: path.join(__dirname, '.env') });

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

    logger.info('Connecting to MongoDB...');

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
    });
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    logger.error('Connection error details:', err);
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Додаткове логування тіла запиту для debug
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    logger.debug('Request body:', req.body);
  }
  next();
});

// Додайте тестовий маршрут прямо перед Swagger UI
app.get('/test-swagger', (req, res) => {
  console.log('✅ Test route called');
  res.json({
    message: 'Test route works',
    timestamp: new Date().toISOString(),
  });
});

// Налаштування Swagger UI
try {
  const swaggerPath = path.join(__dirname, '..', 'docs', 'swagger.json');
  console.log('🔍 Looking for swagger.json at:', swaggerPath);
  console.log('🔍 Absolute path:', path.resolve(swaggerPath));

  if (!fs.existsSync(swaggerPath)) {
    console.log('❌ swagger.json not found at:', swaggerPath);

    // Перевіримо чи існує батьківська директорія
    const parentDir = path.dirname(swaggerPath);
    console.log('🔍 Parent directory exists:', fs.existsSync(parentDir));

    if (fs.existsSync(parentDir)) {
      const files = fs.readdirSync(parentDir);
      console.log('📋 Files in parent directory:', files);
    }

    throw new Error('swagger.json file not found');
  }

  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8'));
  console.log('✅ swagger.json loaded successfully');
  console.log('📊 Swagger document keys:', Object.keys(swaggerDocument));

  // Додамо middleware з додатковим логуванням
  app.use(
    '/api-docs',
    (req, res, next) => {
      console.log('🔄 Swagger UI middleware called for:', req.originalUrl);
      next();
    },
    swaggerUi.serve,
    (req, res, next) => {
      console.log('✅ Swagger UI serving for:', req.originalUrl);
      next();
    },
    swaggerUi.setup(swaggerDocument),
  );

  console.log('✅ Swagger UI configured at /api-docs');
} catch (error) {
  console.error('❌ Failed to setup Swagger UI:', error.message);
  console.error('Error stack:', error.stack);

  // Fallback з логуванням
  app.use(
    '/api-docs',
    (req, res, next) => {
      console.log('🔄 Fallback Swagger UI called for:', req.originalUrl);
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup({}),
  );

  console.log('⚠️ Using empty Swagger UI as fallback');
}

// Логування запитів
app.use((req, res, next) => {
  console.log('📨 Incoming request:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    time: new Date().toISOString(),
  });
  next();
});

// Після Swagger UI додайте перевірку
app.use((req, res, next) => {
  console.log('🔍 Request reached main middleware:', req.originalUrl);
  next();
});

// Підключення роутів
app.use('/auth', authRouter);
app.use('/contacts', contactsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name,
      host: mongoose.connection.host,
    },
    environment: process.env.NODE_ENV,
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

    if (mongoose.connection.readyState !== 1) {
      logger.error('MongoDB connection not established. Exiting...');
      process.exit(1);
    }

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌐 Client URL: ${process.env.CLIENT_URL}`);
      logger.info(`🗄️  Database: ${process.env.MONGODB_DB}`);
      logger.info(
        `📚 Swagger UI available at http://localhost:${PORT}/api-docs`,
      );
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
      logger.info('- GET /health (health check)');
      logger.info('- GET /api-docs (Swagger UI)');
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`🛑 Received ${signal}, closing server...`);

      server.close(async () => {
        logger.info('✅ Server closed');

        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          logger.info('✅ MongoDB connection closed');
        }

        logger.info('✅ Process exited gracefully');
        process.exit(0);
      });

      // Таймаут для форсованого завершення
      setTimeout(() => {
        logger.error(
          '❌ Could not close connections in time, forcefully shutting down',
        );
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Запуск сервера
startServer();

// Експорт для тестування
export { app, connectDB };
