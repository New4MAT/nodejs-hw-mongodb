import express from 'express';
import cors from 'cors';
import contactsRouter from './routes/contactsRoutes.js';
import pino from 'pino';

const logger = pino();

export const setupServer = () => {
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
  app.use('/contacts', contactsRouter);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      message: 'Not found',
    });
  });

  // Error Handler
  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  });

  const PORT = process.env.PORT || 3000;
  return app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};
