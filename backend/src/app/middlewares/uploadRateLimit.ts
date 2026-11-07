import rateLimit from 'express-rate-limit';
import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';

const WINDOW_MINUTES = 15;
const MAX_UPLOADS = 10;

// Must come after isAuth: uploads are counted per user, not per IP address.
export const uploadRateLimit = rateLimit({
  windowMs: WINDOW_MINUTES * 60 * 1000,
  limit: MAX_UPLOADS,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.userId,
  handler: (req, res, next) =>
    next(
      new ApiError(
        httpStatus.TOO_MANY_REQUESTS,
        `Upload limit reached. You can upload ${MAX_UPLOADS} files every ${WINDOW_MINUTES} minutes.`,
      ),
    ),
});
