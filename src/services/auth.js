import { User } from '../models/userModel.js';
import { Session } from '../models/sessionModel.js';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';

const generateTokens = (userId) => {
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
    ...tokens,
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

  await Session.create({
    userId: user._id,
    ...tokens,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
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
