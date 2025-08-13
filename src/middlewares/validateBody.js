import { validationResult } from 'express-validator';
import createError from 'http-errors';
import mongoose from 'mongoose';

// Універсальний middleware для валідації
export const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      // Якщо схема - масив (express-validator)
      if (Array.isArray(schema)) {
        await Promise.all(schema.map((validation) => validation.run(req)));
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          const errorDetails = errors.array().map((err) => ({
            field: err.param,
            message: err.msg,
            value: err.value,
          }));

          return next(
            createError(400, 'Validation failed', {
              errors: errorDetails,
            }),
          );
        }
      }
      // Якщо схема - об'єкт Joi
      else if (schema && typeof schema.validate === 'function') {
        const { error } = schema.validate(req.body);
        if (error) {
          throw createError(400, error.details[0].message);
        }
      }
      // Невідомий тип схеми
      else {
        throw new Error('Invalid schema type provided to validateBody');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Middleware для перевірки валідності ID
export const isValidId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(createError(400, 'Invalid id format'));
  }
  next();
};
