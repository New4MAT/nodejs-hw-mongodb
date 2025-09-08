import createError from 'http-errors';
import pino from 'pino';

const logger = pino();

export const notFoundHandler = (req, res, next) => {
  next(createError(404, 'Route not found'));
};

export const errorHandler = (err, req, res, next) => {
  logger.error(err);

  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
