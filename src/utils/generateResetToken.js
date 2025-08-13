import jwt from 'jsonwebtoken';

export const generateResetToken = (email) => {
  return jwt.sign(
    { email },
    process.env.JWT_RESET_SECRET || 'your_fallback_reset_secret',
    { expiresIn: '15m' },
  );
};
