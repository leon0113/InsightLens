import { z } from 'zod';

// bcrypt only reads the first 72 bytes, so longer passwords would be silently cut.
const password = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .min(8, `${label} must be at least 8 characters`)
    .max(72, `${label} must be at most 72 characters`);

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .email('Enter a valid email address');

const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, 'Name is required')
      .max(80, 'Name must be at most 80 characters'),
    email,
    password: password('Password'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string({ required_error: 'Password is required' }).min(1),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: 'Current password is required' }),
    newPassword: password('New password'),
  }),
});

export const AuthValidation = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
};
