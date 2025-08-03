import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  getCurrentUser,
} from '../services/auth.js';

export const register = async (req, res) => {
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
};

export const login = async (req, res) => {
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
    data: {
      accessToken,
    },
  });
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

  res.json({
    status: 200,
    message: 'Successfully refreshed a session!',
    data: {
      accessToken,
    },
  });
};

export const logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  await logoutUser(refreshToken);

  res.clearCookie('refreshToken');
  res.status(204).end();
};

export const getCurrent = async (req, res) => {
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
};
