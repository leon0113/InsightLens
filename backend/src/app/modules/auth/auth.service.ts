import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { USER_ROLE } from '../../enums/user';
import { IUser } from '../entity/users/user.interface';
import { User } from '../entity/users/user.model';
import {
  IAuthTokens,
  IChangePasswordPayload,
  ILoginPayload,
  IRegisterPayload,
} from './auth.interface';

const DUPLICATE_KEY_CODE = 11000;

const toUserId = (email: string) => email.trim().toLowerCase();

const createAccessToken = (user: Pick<IUser, 'userId' | 'role'>) =>
  jwtHelpers.createToken(
    { userId: user.userId, role: user.role },
    config.jwt.secret,
    config.jwt.expires_in,
  );

const createTokens = (user: Pick<IUser, 'userId' | 'role'>): IAuthTokens => ({
  accessToken: createAccessToken(user),
  refreshToken: jwtHelpers.createToken(
    { userId: user.userId, role: user.role },
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in,
  ),
});

const register = async (payload: IRegisterPayload): Promise<IAuthTokens> => {
  try {
    // Self sign-up chooses its own password, so no change is needed.
    const user = await User.create({
      userId: toUserId(payload.email),
      name: payload.name.trim(),
      password: payload.password,
      role: USER_ROLE.USER,
      needsPasswordChange: false,
    });
    return createTokens(user);
  } catch (error) {
    if ((error as { code?: number }).code === DUPLICATE_KEY_CODE) {
      throw new ApiError(
        httpStatus.CONFLICT,
        'An account with this email already exists',
      );
    }
    throw error;
  }
};

const login = async (payload: ILoginPayload): Promise<IAuthTokens> => {
  const user = await User.findOne({ userId: toUserId(payload.email) }).select(
    '+password',
  );

  // One message for both cases, so the response does not reveal which emails exist.
  const isMatch =
    user && (await User.isPasswordMatched(payload.password, user.password));
  if (!user || !isMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  if (user.isBlocked) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This account has been blocked');
  }
  return createTokens(user);
};

const refreshToken = async (token: string | undefined) => {
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  let userId: string;
  try {
    ({ userId } = jwtHelpers.verifyToken(token, config.jwt.refresh_secret));
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token');
    }
    throw error;
  }

  const user = await User.findOne({ userId });
  if (!user || user.isBlocked) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  return { accessToken: createAccessToken(user) };
};

const changePassword = async (
  id: Types.ObjectId,
  payload: IChangePasswordPayload,
) => {
  const user = await User.findById(id).select('+password');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const isMatch = await User.isPasswordMatched(
    payload.oldPassword,
    user.password,
  );
  if (!isMatch) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Current password is incorrect',
    );
  }

  user.password = payload.newPassword;
  user.needsPasswordChange = false;
  await user.save();
};

export const AuthService = {
  register,
  login,
  refreshToken,
  changePassword,
};
