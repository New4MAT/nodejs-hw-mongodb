import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  getCurrentUser,
  sendResetPasswordEmail,
  resetPassword,
} from '../services/auth.js';
import createError from 'http-errors';
import pino from 'pino-pretty';

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

export const register = async (req, res, next) => {
  try {
    const { user, refreshToken } = await registerUser(req.body);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(201).json({
      status: 201,
      message: 'Successfully registered a user!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return next(
        createError(400, 'Validation failed', { details: error.errors }),
      );
    }
    if (error.message === 'Email already in use') {
      return next(createError(409, error.message));
    }
    logger.error('Registration error:', error);
    next(createError(500, 'Registration failed'));
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, sessionId } = await loginUser(
      email,
      password,
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({
      status: 200,
      message: 'Successfully logged in an user!',
      data: { accessToken },
    });
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return next(createError(401, error.message));
    }
    logger.error('Login error:', error);
    next(createError(500, 'Login failed'));
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    const { accessToken, newRefreshToken } = await refreshSession(refreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({
      status: 200,
      message: 'Successfully refreshed a session!',
      data: { accessToken },
    });
  } catch (error) {
    if (error.message === 'Invalid refresh token') {
      return next(createError(401, error.message));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Refresh token expired'));
    }
    logger.error('Refresh session error:', error);
    next(createError(500, 'Session refresh failed'));
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    await logoutUser(refreshToken);

    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');
    res.status(204).end();
  } catch (error) {
    if (error.message === 'Session not found') {
      return next(createError(404, error.message));
    }
    logger.error('Logout error:', error);
    next(createError(500, 'Logout failed'));
  }
};

export const getCurrent = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user._id);
    res.json({
      status: 200,
      message: 'Current user',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return next(createError(404, error.message));
    }
    logger.error('Get current user error:', error);
    next(createError(500, 'Failed to get current user'));
  }
};

export const sendResetEmail = async (req, res, next) => {
  try {
    const result = await sendResetPasswordEmail(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPwd = async (req, res, next) => {
  try {
    const result = await resetPassword(req.body.token, req.body.password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
