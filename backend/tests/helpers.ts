import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import request from 'supertest';
import app from '../src/app';

export const api = () => request(app);

export type TestUser = { email: string; password: string; token: string };

export const registerUser = async (): Promise<TestUser> => {
  const email = `user-${randomUUID()}@example.com`;
  const password = 'correct-horse-battery';
  const res = await api()
    .post('/api/v1/auth/register')
    .send({ name: 'Test User', email, password })
    .expect(201);
  return { email, password, token: res.body.data.accessToken };
};

export const uploadCsv = (token: string, content: string, name = 'data.csv') =>
  api()
    .post('/api/v1/datasets')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.from(content), name);

// Polls like the frontend does, until the analysis has finished either way.
export const waitForDataset = async (token: string, id: string) => {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const res = await api()
      .get(`/api/v1/datasets/${id}`)
      .set('Authorization', `Bearer ${token}`);
    if (res.body.data.status !== 'processing') {
      return res.body.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Dataset ${id} was still processing`);
};

export const uploadedFiles = async () =>
  (await fs.readdir('uploads')).filter((name) => name !== '.gitkeep');

export const SMALL_CSV =
  'city,temp,rain\nOslo,4.5,yes\nRome,18.2,no\nLima,19.0,no\n';
