export type IRegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type ILoginPayload = {
  email: string;
  password: string;
};

export type IChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

export type IAuthTokens = {
  accessToken: string;
  refreshToken: string;
};
