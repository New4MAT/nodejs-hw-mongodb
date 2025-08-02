import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import { Session } from '../models/sessionModel.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw createError(401, 'Not authorized');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw createError(401, 'Not authorized');
    }

    const { userId } = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const session = await Session.findOne({
      userId,
      accessToken: token,
      accessTokenValidUntil: { $gt: new Date() },
    });

    if (!session) {
      throw createError(401, 'Not authorized');
    }

    req.user = { _id: userId };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(createError(401, 'Access token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(createError(401, 'Not authorized'));
    } else {
      next(error);
    }
  }
};
