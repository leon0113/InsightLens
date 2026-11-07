import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import { User } from '../modules/entity/users/user.model';

// Usage: isAuth() for any signed-in user, isAuth(USER_ROLE.ADMIN) for a role.
export const isAuth =
  (...requiredRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      const payload = jwtHelpers.verifyToken(token, config.jwt.secret);

      const user = await User.findOne({ userId: payload.userId });
      if (!user || user.isBlocked) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      if (requiredRoles.length && !requiredRoles.includes(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access forbidden');
      }

      req.user = { _id: user._id, userId: user.userId, role: user.role };
      next();
    } catch (error) {
      // TokenExpiredError extends JsonWebTokenError, so this covers both.
      if (error instanceof jwt.JsonWebTokenError) {
        return next(
          new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'),
        );
      }
      next(error);
    }
  };
