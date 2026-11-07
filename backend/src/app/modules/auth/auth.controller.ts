import { CookieOptions, Request, Response } from 'express';
import httpStatus from 'http-status';
import config from '../../../config';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';

const REFRESH_COOKIE = 'refreshToken';
const isProduction = config.NODE_ENV === 'production';

// In production the frontend and API live on different sites, which needs
// SameSite=None, and browsers only accept that on a secure cookie.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions,
    expires: jwtHelpers.getExpiry(token),
  });
};

const register = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, refreshToken } = await AuthService.register(req.body);
  setRefreshCookie(res, refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Account created successfully',
    data: { accessToken },
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, refreshToken } = await AuthService.login(req.body);
  setRefreshCookie(res, refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged in successfully',
    data: { accessToken },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.refreshToken(req.cookies[REFRESH_COOKIE]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token refreshed successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.changePassword(req.user._id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password changed successfully',
    data: null,
  });
});

const logOut = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});

export const AuthController = {
  register,
  login,
  refreshToken,
  changePassword,
  logOut,
};
