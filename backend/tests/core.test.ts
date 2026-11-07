import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { USER_ROLE } from '../src/app/enums/user';
import globalErrorHandler from '../src/app/middlewares/globalErrorHandler';
import { isAuth } from '../src/app/middlewares/isAuth.middleware';
import { api, registerUser } from './helpers';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('error handling', () => {
  it('returns 404 in the standard shape for an unknown route', async () => {
    const res = await api().get('/api/v1/does-not-exist').expect(404);

    expect(res.body).toEqual({
      success: false,
      message: 'Route not found',
      errorMessages: [
        { path: '/api/v1/does-not-exist', message: 'API not found' },
      ],
    });
  });

  it('returns 400 with errorMessages for an invalid body', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation Error');
    expect(res.body.errorMessages).toEqual(
      expect.arrayContaining([
        { path: 'email', message: 'Enter a valid email address' },
        { path: 'password', message: 'Password must be at least 8 characters' },
      ]),
    );
  });

  it('returns 404, not 500, for an ApiError thrown in a service', async () => {
    const { token } = await registerUser();
    const res = await api()
      .get('/api/v1/datasets/0123456789abcdef01234567')
      .set(bearer(token))
      .expect(404);

    expect(res.body.message).toBe('Dataset not found');
  });
});

describe('protected routes', () => {
  it('returns 401 without a token and with a bad token', async () => {
    await api().get('/api/v1/datasets').expect(401);
    await api().get('/api/v1/datasets').set(bearer('not.a.jwt')).expect(401);
  });

  it('returns 403 when the role is wrong', async () => {
    // No app route needs a role yet, so mount one just for this check.
    const adminOnly = express();
    adminOnly.get('/admin', isAuth(USER_ROLE.ADMIN), (req, res) => {
      res.json({ ok: true });
    });
    adminOnly.use(globalErrorHandler);
    const { token } = await registerUser();

    const res = await request(adminOnly)
      .get('/admin')
      .set(bearer(token))
      .expect(403);

    expect(res.body.message).toBe('Access forbidden');
  });
});

describe('auth', () => {
  it('logs in with the right password and sets an httpOnly refresh cookie', async () => {
    const { email, password } = await registerUser();
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: email.toUpperCase(), password })
      .expect(200);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^refreshToken=/);
    expect(cookie).toContain('HttpOnly');
  });

  it('rejects a wrong password and an unknown email with the same message', async () => {
    const { email } = await registerUser();
    const wrongPassword = await api()
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' })
      .expect(401);

    expect(wrongPassword.body.message).toBe('Incorrect email or password');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('refuses a second account with the same email', async () => {
    const { email } = await registerUser();
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Copy', email, password: 'another-password' })
      .expect(409);

    expect(res.body.message).toBe('An account with this email already exists');
  });

  it('issues a new access token from the refresh cookie', async () => {
    const agent = request.agent((await import('../src/app')).default);
    const { email, password } = await registerUser();
    await agent
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const res = await agent.post('/api/v1/auth/refresh-token').expect(200);
    await api().post('/api/v1/auth/refresh-token').expect(401);

    await api()
      .get('/api/v1/users/me')
      .set(bearer(res.body.data.accessToken))
      .expect(200);
  });

  it('changes the password', async () => {
    const { email, password, token } = await registerUser();
    await api()
      .post('/api/v1/auth/change-password')
      .set(bearer(token))
      .send({ oldPassword: password, newPassword: 'a-brand-new-password' })
      .expect(200);

    await api()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);
    await api()
      .post('/api/v1/auth/login')
      .send({ email, password: 'a-brand-new-password' })
      .expect(200);
  });

  it('clears the refresh cookie on log out', async () => {
    const { token } = await registerUser();
    const res = await api()
      .post('/api/v1/auth/log-out')
      .set(bearer(token))
      .expect(200);

    expect(res.headers['set-cookie'][0]).toMatch(
      /^refreshToken=;.*Expires=Thu, 01 Jan 1970/,
    );
  });

  it('returns the profile without the password', async () => {
    const { email, token } = await registerUser();
    const res = await api()
      .get('/api/v1/users/me')
      .set(bearer(token))
      .expect(200);

    expect(res.body.data.userId).toBe(email);
    expect(res.body.data.role).toBe('user');
    expect(res.body.data.needsPasswordChange).toBe(false);
    expect(res.body.data).not.toHaveProperty('password');
  });
});
