import { User } from '../models/userModel.js';
import { Session } from '../models/sessionModel.js';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import { sendPasswordResetEmailMessage } from '../services/email.js';
import bcrypt from 'bcrypt';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d',
  });

  return {
    accessToken,
    refreshToken,
    accessTokenValidUntil: new Date(Date.now() + 15 * 60 * 1000),
    refreshTokenValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
};

export const registerUser = async (userData) => {
  const { email, password } = userData;

  if (!email || !password) {
    throw createError(400, 'Email and password are required');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createError(409, 'Email already in use');
  }

  const newUser = await User.create(userData);
  const tokens = generateTokens(newUser._id);

  await Session.create({
    userId: newUser._id,
    ...tokens,
  });

  return {
    user: {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    },
    refreshToken: tokens.refreshToken,
  };
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw createError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.checkPassword(password);
  if (!isPasswordValid) {
    throw createError(401, 'Invalid email or password');
  }

  await Session.deleteMany({ userId: user._id });
  const tokens = generateTokens(user._id);

  const session = await Session.create({
    userId: user._id,
    ...tokens,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    sessionId: session._id.toString(),
  };
};

export const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    throw createError(401, 'Refresh token is required');
  }

  const { userId } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const session = await Session.findOne({ refreshToken });

  if (!session) {
    throw createError(401, 'Invalid refresh token');
  }

  await Session.deleteOne({ refreshToken });
  const tokens = generateTokens(userId);

  await Session.create({
    userId,
    ...tokens,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

export const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    throw createError(400, 'Refresh token is required');
  }

  const result = await Session.deleteOne({ refreshToken });
  if (result.deletedCount === 0) {
    throw createError(404, 'Session not found');
  }

  return true;
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw createError(404, 'User not found');
  }
  return user;
};

export const sendResetPasswordEmail = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn(`Password reset requested for non-existent email: ${email}`);
    throw createError(404, 'User not found!');
  }

  console.log('Generating token for email:', email);

  const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

  const resetLink = `${process.env.APP_DOMAIN}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmailMessage(email, resetLink);
    logger.info(`Reset password email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send reset email to ${email}:`, error);
    throw createError(500, 'Failed to send the email, please try again later.');
  }

  return {
    status: 200,
    message: 'Reset password email has been successfully sent.',
    data: {},
  };
};

export const resetPassword = async (token, newPassword) => {
  let decoded;
  try {
    console.log('Verifying token:', token);
    console.log('Using JWT_SECRET:', process.env.JWT_SECRET);

    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'TokenExpiredError') {
      throw createError(
        401,
        'Token is expired. Please request a new password reset link.',
      );
    }
    if (error.name === 'JsonWebTokenError') {
      throw createError(
        401,
        'Token is invalid. Please check the token and try again.',
      );
    }
    throw createError(401, 'Token verification failed');
  }

  try {
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      logger.warn(`User not found for email: ${decoded.email}`);
      throw createError(404, 'User not found!');
    }

    // Check if new password is different from current
    const isSamePassword = await user.checkPassword(newPassword);
    if (isSamePassword) {
      throw createError(
        400,
        'New password must be different from current password',
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await Session.deleteMany({ userId: user._id });
    logger.info(`Password successfully reset for user: ${user._id}`);

    return {
      status: 200,
      message: 'Password has been successfully reset.',
      data: {},
    };
  } catch (error) {
    logger.error('Password reset failed:', error);
    throw error;
  }
};
