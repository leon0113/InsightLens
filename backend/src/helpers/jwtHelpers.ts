import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

const createToken = (
  payload: object,
  secret: Secret,
  expiresIn: string | number,
) => {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

// Lets a cookie expire at the same moment as the token it holds.
const getExpiry = (token: string): Date => {
  const { exp } = jwt.decode(token) as JwtPayload;
  return new Date(Number(exp) * 1000);
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  getExpiry,
};
