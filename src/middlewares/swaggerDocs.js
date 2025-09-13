import createError from 'http-errors';
import swaggerUI from 'swagger-ui-express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SWAGGER_PATH = path.join(__dirname, '..', 'docs', 'swagger.json');

export const swaggerDocs = () => {
  return async (req, res, next) => {
    try {
      const swaggerDoc = JSON.parse(await fs.readFile(SWAGGER_PATH, 'utf-8'));
      return swaggerUI.setup(swaggerDoc)(req, res, next);
    } catch (err) {
      console.error('Swagger docs error:', err.message);
      return next(createError(500, "Can't load swagger docs"));
    }
  };
};