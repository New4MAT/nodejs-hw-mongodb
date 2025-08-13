import express from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import {
  register,
  login,
  refresh,
  logout,
  getCurrent,
  sendResetEmail,
  resetPwd,
} from '../controllers/auth.js';
import { validateBody } from '../middlewares/validateBody.js';
import {
  registerSchema,
  loginSchema,
  requestResetEmailSchema,
  resetPwdSchema,
} from '../schemas/authSchemas.js';
import { authenticate } from '../middlewares/authenticate.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth routes
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  ctrlWrapper(register),
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  ctrlWrapper(login),
);

router.post('/refresh', authLimiter, ctrlWrapper(refresh));

router.post('/logout', authLimiter, authenticate, ctrlWrapper(logout));

router.get('/current', authenticate, ctrlWrapper(getCurrent));

// Password reset routes
router.post(
  '/send-reset-email',
  validateBody(requestResetEmailSchema),
  ctrlWrapper(sendResetEmail),
);

router.post('/reset-pwd', validateBody(resetPwdSchema), ctrlWrapper(resetPwd));

export default router;
