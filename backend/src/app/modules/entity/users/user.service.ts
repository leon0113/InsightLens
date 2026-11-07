import httpStatus from 'http-status';
import { Types } from 'mongoose';
import ApiError from '../../../../errors/ApiError';
import { User } from './user.model';

const getMyProfile = async (id: Types.ObjectId) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

export const UserService = {
  getMyProfile,
};
