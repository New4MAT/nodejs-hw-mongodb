import express from 'express';
import cors from 'cors';
import contactsRouter from './routes/contactsRoutes.js';
import pino from 'pino';
import mongoose from 'mongoose';

const logger = pino();

export const setupServer = async () => {
  try {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Logging
    app.use((req, res, next) => {
      logger.info(`${req.method} ${req.originalUrl}`);
      next();
    });

    // Routes
    app.use('/api/contacts', contactsRouter);

    // 404 Handler
    app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Not found',
      });
    });

    // Error Handler
    app.use((err, req, res, next) => {
      logger.error(err.stack);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: 'Internal server error',
      });
    });

    const PORT = process.env.PORT || 3000;

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed');
          process.exit(0);
        });
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};
