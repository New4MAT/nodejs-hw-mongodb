import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  getCurrentUser,
} from '../services/auth.js';
import { formatResponse } from '../utils/formatResponse.js';

export const register = async (req, res) => {
  const { user, accessToken, refreshToken } = await registerUser(req.body);
  res.status(201).json(
    formatResponse(201, 'Successfully registered a user!', {
      user,
      accessToken,
      refreshToken,
    }),
  );
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken, user } = await loginUser(email, password);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  res.json(
    formatResponse(200, 'Successfully logged in an user!', {
      accessToken,
      user,
    }),
  );
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;
  const { accessToken, refreshToken: newRefreshToken } = await refreshSession(
    refreshToken,
  );

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  res.json(
    formatResponse(200, 'Successfully refreshed a session!', {
      accessToken,
    }),
  );
};

export const logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  await logoutUser(refreshToken);

  res.clearCookie('refreshToken');
  res.status(204).end();
};

export const getCurrent = async (req, res) => {
  const user = await getCurrentUser(req.user._id);
  res.json(formatResponse(200, 'Current user', { user }));
};
