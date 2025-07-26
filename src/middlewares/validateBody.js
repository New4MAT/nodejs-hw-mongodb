import { validationResult } from 'express-validator';
import createError from 'http-errors';
import mongoose from 'mongoose';

export const validateBody = (schema) => {
  return async (req, res, next) => {
    await Promise.all(schema.map((validation) => validation.run(req)));
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      }));

      throw createError(400, 'Validation failed', {
        errors: errorDetails,
      });
    }

    next();
  };
};

export const isValidId = (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid ID format');
  }

  next();
};
