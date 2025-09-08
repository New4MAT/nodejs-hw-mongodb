import { User } from '../models/userModel.js';
import { Session } from '../models/sessionModel.js';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import { sendPasswordResetEmail } from '../services/email.js';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Перевірка підключення до MongoDB
const checkMongoConnection = () => {
  console.log('🔗 MongoDB connection state:', mongoose.connection.readyState);
  return mongoose.connection.readyState === 1;
};

export const generateTokens = (userId) => {
  console.log('🔑 Generating tokens for user:', userId);
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

export const registerUser = async (req, res, next) => {
  try {
    console.log('=== REGISTRATION STARTED ===');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

    if (!checkMongoConnection()) {
      console.log('❌ MongoDB not connected!');
      throw createError(500, 'Database connection failed');
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      console.log('❌ Missing fields');
      throw createError(400, 'Name, email and password are required');
    }

    console.log('🔍 Searching for existing user:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists');
      throw createError(409, 'Email already in use');
    }

    console.log('👤 Creating user...');
    const newUser = await User.create({
      email,
      password,
      name,
    });
    console.log('✅ User created:', newUser._id);

    const tokens = generateTokens(newUser._id);

    console.log('💾 Creating session...');
    await Session.create({
      userId: newUser._id,
      ...tokens,
    });

    console.log('🍪 Setting cookies...');
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    console.log('✅ REGISTRATION COMPLETED SUCCESSFULLY');
    return res.status(201).json({
      status: 201,
      message: 'User registered successfully',
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          createdAt: newUser.createdAt,
        },
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('🔥 REGISTRATION ERROR:', error.message);
    if (error.status) {
      next(error);
    } else {
      next(createError(500, 'Registration failed'));
    }
  }
};

export const loginUser = async (req, res, next) => {
  try {
    console.log('=== LOGIN STARTED ===');
    console.log('📥 Login request body:', JSON.stringify(req.body, null, 2));

    if (!checkMongoConnection()) {
      console.log('❌ MongoDB not connected!');
      throw createError(500, 'Database connection failed');
    }

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing email or password');
      throw createError(400, 'Email and password are required');
    }

    console.log('🔍 Searching for user:', email);

    let user;
    try {
      user = await User.findOne({ email }).select('+password');
      console.log('✅ User search completed, found:', !!user);
      if (user) {
        console.log('🔍 User found with password:', !!user.password);
      }
    } catch (searchError) {
      console.error('❌ User search failed:', searchError.message);
      throw createError(500, 'Database operation failed');
    }

    if (!user) {
      console.log('❌ User not found');
      throw createError(401, 'Invalid email or password');
    }

    console.log('🔐 Comparing passwords...');
    console.log('Input password:', password);
    console.log('Stored hash exists:', !!user.password);

    let isPasswordValid;
    try {
      if (!password || !user.password) {
        console.log('❌ Missing password or hash');
        throw new Error('Password or hash is missing');
      }

      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('✅ Password comparison result:', isPasswordValid);
    } catch (compareError) {
      console.error('❌ Password comparison failed:', compareError.message);
      throw createError(500, 'Password verification failed');
    }

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      throw createError(401, 'Invalid email or password');
    }

    console.log('🗑️ Deleting old sessions...');
    await Session.deleteMany({ userId: user._id });

    console.log('🎫 Generating tokens...');
    const tokens = generateTokens(user._id);

    console.log('💾 Creating session...');
    const session = await Session.create({
      userId: user._id,
      ...tokens,
    });

    console.log('🍪 Setting cookies...');
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.cookie('sessionId', session._id.toString(), {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    console.log('✅ LOGIN COMPLETED SUCCESSFULLY');
    return res.status(200).json({
      status: 200,
      message: 'Successfully logged in!',
      data: {
        accessToken: tokens.accessToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error('🔥 LOGIN ERROR:', error.message);
    if (error.status) {
      next(error);
    } else {
      next(createError(500, 'Login failed'));
    }
  }
};

export const refreshSession = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
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

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({
      status: 200,
      message: 'Tokens refreshed successfully',
      data: { accessToken: tokens.accessToken },
    });
  } catch (error) {
    console.error('Refresh error:', error.message);
    if (error.name === 'TokenExpiredError') {
      next(createError(401, 'Refresh token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(createError(401, 'Invalid refresh token'));
    } else {
      next(createError(500, 'Token refresh failed'));
    }
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw createError(400, 'Refresh token is required');
    }

    const result = await Session.deleteOne({ refreshToken });
    if (result.deletedCount === 0) {
      throw createError(404, 'Session not found');
    }

    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    return res.status(200).json({
      status: 200,
      message: 'Successfully logged out',
      data: {},
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    if (error.status) {
      next(error);
    } else {
      next(createError(500, 'Logout failed'));
    }
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      throw createError(404, 'User not found');
    }

    return res.status(200).json({
      status: 200,
      message: 'Current user retrieved successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Get current user error:', error.message);
    if (error.status) {
      next(error);
    } else {
      next(createError(500, 'Failed to get current user'));
    }
  }
};

export const sendResetPasswordEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log('📧 Request to send reset email for:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found for email:', email);
      throw createError(404, 'User not found!');
    }

    console.log('✅ User found, generating reset token...');
    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '5m',
    });

    const resetLink = `${process.env.APP_DOMAIN}/reset-password?token=${resetToken}`;

    console.log('🔐 RESET TOKEN FOR TESTING:', resetToken);
    console.log('🔗 Reset link:', resetLink);

    try {
      console.log('📤 Attempting to send email...');
      await sendPasswordResetEmail(user.email, resetLink);
      console.log('✅ Email sent successfully');
    } catch (emailError) {
      console.error('❌ Email sending failed, but continuing for testing...');
      console.error('Email error:', emailError.message);
    }

    return res.status(200).json({
      status: 200,
      message:
        'Reset password process initiated. Check console for test token.',
      data: {
        testToken:
          process.env.NODE_ENV === 'development' ? resetToken : undefined,
      },
    });
  } catch (error) {
    console.error('🔥 Send reset email error:', error.message);
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    console.log('🔄 Starting password reset process');
    console.log('📝 Token received:', token ? 'Yes' : 'No');
    console.log('🔑 New password received:', password ? 'Yes' : 'No');

    if (!token || !password) {
      console.log('❌ Missing token or password');
      throw createError(400, 'Token and password are required');
    }

    console.log('🔍 Verifying token...');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified successfully');
      console.log('📧 Decoded email:', decoded.email);
    } catch (jwtError) {
      console.error('❌ Token verification failed:', jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        throw createError(
          401,
          'Token is expired. Please request a new reset link.',
        );
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw createError(
          401,
          'Invalid token. Please check the link and try again.',
        );
      } else {
        throw createError(401, 'Token verification failed');
      }
    }

    if (!decoded || !decoded.email) {
      console.log('❌ Invalid token payload');
      throw createError(401, 'Invalid token payload');
    }

    console.log('👤 Searching for user with email:', decoded.email);
    const user = await User.findOne({ email: decoded.email }).select(
      '+password',
    );
    if (!user) {
      console.log('❌ User not found for email:', decoded.email);
      throw createError(404, 'User not found!');
    }
    console.log('✅ User found:', user._id);
    console.log('🔍 User password exists:', !!user.password);

    console.log('🔐 Checking if new password is different from current one...');
    if (!user.password) {
      console.log('❌ User has no password set');
      throw createError(400, 'User password is not set');
    }

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      console.log('❌ New password is the same as current password');
      throw createError(400, 'New password must be different from current one');
    }
    console.log('✅ New password is different');

    console.log(
      '🔒 Setting new password directly (hashing will be done by pre-save hook)...',
    );
    user.password = password;

    console.log('💾 Saving user with new password...');
    await user.save();
    console.log('✅ Password updated successfully');

    console.log('🗑️ Deleting user sessions...');
    const deleteResult = await Session.deleteMany({ userId: user._id });
    console.log(`✅ Deleted ${deleteResult.deletedCount} sessions`);

    console.log('✅ PASSWORD RESET COMPLETED SUCCESSFULLY');
    return res.status(200).json({
      status: 200,
      message: 'Password has been successfully reset.',
      data: {},
    });
  } catch (error) {
    console.error('🔥 Reset password error:', error.message);
    console.error('Error stack:', error.stack);

    if (error.name === 'TokenExpiredError') {
      next(
        createError(401, 'Token is expired. Please request a new reset link.'),
      );
    } else if (error.name === 'JsonWebTokenError') {
      next(
        createError(401, 'Invalid token. Please check the link and try again.'),
      );
    } else if (error.status) {
      next(error);
    } else {
      next(createError(500, `Password reset failed: ${error.message}`));
    }
  }
};
