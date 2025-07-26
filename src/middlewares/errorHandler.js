import pino from 'pino';
const logger = pino();

export const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  if (err.status === 400 && err.errors) {
    return res.status(400).json({
      status: 400,
      message: err.message || 'Validation failed',
      errors: err.errors,
      data: null,
    });
  }

  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || 'Something went wrong',
    data: err.data || null,
    ...(err.errors && { errors: err.errors }),
  });
};
