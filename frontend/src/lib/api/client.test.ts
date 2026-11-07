import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setSessionExpiredHandler } from './client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setSessionExpiredHandler(null);
});

describe('api client', () => {
  it('refreshes the access token once after a 401 and retries the request', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(
        json(200, { data: { accessToken: 'fresh-token' } }),
      )
      .mockResolvedValueOnce(json(200, { data: { name: 'Leon' } }));

    const user = await api.users.me();

    expect(user).toEqual({ name: 'Leon' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]![0])).toContain(
      '/auth/refresh-token',
    );
    const retry = fetchMock.mock.calls[2]![1]!;
    expect(retry.headers).toMatchObject({
      Authorization: 'Bearer fresh-token',
    });
    expect(retry.credentials).toBe('include');
  });

  it('ends the session when the refresh fails too', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(json(401, { message: 'Invalid refresh token' }));

    await expect(api.datasets.get('abc')).rejects.toMatchObject({
      status: 401,
    });
    expect(onExpired).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not refresh for a wrong password on the login form', async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { message: 'Incorrect email or password' }),
    );

    await expect(
      api.auth.login({ email: 'a@b.co', password: 'nope' }),
    ).rejects.toThrow('Incorrect email or password');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps the field errors from a validation response', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, {
        message: 'Validation Error',
        errorMessages: [
          { path: 'email', message: 'Enter a valid email address' },
        ],
      }),
    );

    const error = await api.auth
      .register({ name: 'A', email: 'x', password: 'long-enough' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual([
      { path: 'email', message: 'Enter a valid email address' },
    ]);
  });

  it('reports an unreachable server in plain words', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(api.reports.demo('clinic-appointments')).rejects.toMatchObject(
      {
        status: 0,
        message:
          'Could not reach the server. Check your connection and try again.',
      },
    );
  });
});
