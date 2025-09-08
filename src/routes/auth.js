import express from 'express';
import pino from 'pino';
import { rateLimit } from 'express-rate-limit';
import { validateBody } from '../middlewares/validateBody.js';
import {
  registerSchema,
  loginSchema,
  requestResetEmailSchema,
  resetPwdSchema,
} from '../schemas/authSchemas.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  getCurrentUser,
  sendResetPasswordEmail,
  resetPassword,
} from '../controllers/auth.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();
const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
    },
  },
});

// Rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for IP:', req.ip);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later',
    });
  },
});

// Middleware для логування вхідних запитів
const requestLogger = (req, res, next) => {
  logger.info('📥 Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    body: req.body,
  });
  next();
};

// Маршрут реєстрації
router.post(
  '/register',
  requestLogger,
  authLimiter,
  validateBody(registerSchema),
  ctrlWrapper(registerUser),
);

// Маршрут входу
router.post(
  '/login',
  requestLogger,
  authLimiter,
  validateBody(loginSchema),
  ctrlWrapper(loginUser),
);

// Маршрут оновлення токену
router.post('/refresh', ctrlWrapper(refreshSession));

// Маршрут виходу
router.post('/logout', ctrlWrapper(logoutUser));

// Маршрут поточного користувача
router.get('/current', authenticate, ctrlWrapper(getCurrentUser));

// Маршрут відправки email для скидання пароля
router.post(
  '/send-reset-email',
  validateBody(requestResetEmailSchema),
  ctrlWrapper(sendResetPasswordEmail),
);

// Маршрут скидання пароля
router.post(
  '/reset-pwd',
  validateBody(resetPwdSchema),
  ctrlWrapper(resetPassword),
);

export default router;
