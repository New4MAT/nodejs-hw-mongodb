import { User } from '../models/userModel.js';
import { Session } from '../models/sessionModel.js';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import { sendPasswordResetEmail } from '../services/email.js';
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
  console.log('Registering user with data:', userData);
  const { email, password } = userData;

  if (!email || !password) {
    throw createError(400, 'Email and password are required');
  }

  try {
    console.log('Checking for existing user...');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', existingUser);
      throw createError(409, 'Email already in use');
    }

    console.log('Creating new user...');
    const newUser = await User.create(userData);
    console.log('User created:', newUser);

    const tokens = generateTokens(newUser._id);
    console.log('Tokens generated:', tokens);

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
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    console.log('Searching for user:', email);
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('User not found');
      throw new Error('Invalid email or password');
    }

    console.log('Checking password...');
    const isPasswordValid = await user.checkPassword(password);

    if (!isPasswordValid) {
      console.log('Invalid password');
      throw new Error('Invalid email or password');
    }

    console.log('Creating session...');
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
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      email: email,
    });
    throw error;
  }
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
  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      throw createError(404, 'User not found!');
    }

    // Generate token with 15 minute expiry
    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    // Create reset link
    const resetLink = `${process.env.APP_DOMAIN}/reset-password?token=${resetToken}`;

    // Send email
    await sendPasswordResetEmail(user.email, resetLink);

    return {
      status: 200,
      message: 'Reset password email has been successfully sent.',
      data: {},
    };
  } catch (error) {
    logger.error('Error in sendResetPasswordEmail:', error);
    throw error;
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.email) {
      throw createError(401, 'Invalid or expired token');
    }

    // Find user
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      throw createError(404, 'User not found!');
    }

    // Check if new password is different
    const isSamePassword = await user.checkPassword(newPassword);
    if (isSamePassword) {
      throw createError(400, 'New password must be different from current one');
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Delete all user sessions
    await Session.deleteMany({ userId: user._id });

    return {
      status: 200,
      message: 'Password has been successfully reset.',
      data: {},
    };
  } catch (error) {
    logger.error('Error in resetPassword:', error);

    if (error.name === 'TokenExpiredError') {
      throw createError(
        401,
        'Token is expired. Please request a new reset link.',
      );
    }
    if (error.name === 'JsonWebTokenError') {
      throw createError(
        401,
        'Invalid token. Please check the link and try again.',
      );
    }

    throw error;
  }
};
