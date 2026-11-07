import { Model } from 'mongoose';
import { USER_ROLE } from '../../../enums/user';

// userId holds the user's email address, stored in lowercase.
export interface IUser {
  userId: string;
  name: string;
  password: string;
  role: USER_ROLE;
  needsPasswordChange: boolean;
  isBlocked: boolean;
}

export type UserModel = Model<IUser> & {
  isPasswordMatched(
    givenPassword: string,
    savedPassword: string,
  ): Promise<boolean>;
};
