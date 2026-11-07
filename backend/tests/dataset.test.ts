import { afterEach, describe, expect, it } from 'vitest';
import config from '../src/config';
import {
  SMALL_CSV,
  api,
  registerUser,
  uploadCsv,
  uploadedFiles,
  waitForDataset,
} from './helpers';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const originalAnalysis = { ...config.analysis };

afterEach(() => {
  Object.assign(config.analysis, originalAnalysis);
});

describe('upload and analysis', () => {
  it('accepts with 202, then becomes ready with a report and no file left behind', async () => {
    const { token } = await registerUser();
    const upload = await uploadCsv(token, SMALL_CSV, 'café weather.csv').expect(
      202,
    );

    expect(upload.body.data).toMatchObject({
      name: 'café weather.csv',
      status: 'processing',
    });

    const dataset = await waitForDataset(token, upload.body.data._id);
    expect(dataset).toMatchObject({
      status: 'ready',
      rowCount: 3,
      columnCount: 3,
    });

    const report = await api()
      .get(`/api/v1/reports/${dataset._id}`)
      .set(bearer(token))
      .expect(200);
    expect(report.body.data.report.schemaVersion).toBe('1.1');
    expect(
      report.body.data.report.columns.map((c: { type: string }) => c.type),
    ).toEqual(['categorical', 'numeric', 'boolean']);
    expect(await uploadedFiles()).toEqual([]);
  });

  it('marks the dataset failed with the engine message, and still deletes the file', async () => {
    const { token } = await registerUser();
    const upload = await uploadCsv(token, 'a,b\n').expect(202);

    const dataset = await waitForDataset(token, upload.body.data._id);

    expect(dataset.status).toBe('failed');
    expect(dataset.errorMessage).toBe(
      'The file has a header but no data rows.',
    );
    expect(await uploadedFiles()).toEqual([]);
    const report = await api()
      .get(`/api/v1/reports/${dataset._id}`)
      .set(bearer(token))
      .expect(409);
    expect(report.body.message).toBe(dataset.errorMessage);
  });

  it('hides crash details behind a generic message', async () => {
    config.analysis.script_path = `${originalAnalysis.script_path}.missing`;
    const { token } = await registerUser();
    const upload = await uploadCsv(token, SMALL_CSV).expect(202);

    const dataset = await waitForDataset(token, upload.body.data._id);

    expect(dataset.status).toBe('failed');
    expect(dataset.errorMessage).toBe(
      'The analysis failed unexpectedly. Please try again later.',
    );
    expect(await uploadedFiles()).toEqual([]);
  });

  it('stops an analysis that runs past the timeout', async () => {
    config.analysis.timeout_ms = 1;
    const { token } = await registerUser();
    const upload = await uploadCsv(token, SMALL_CSV).expect(202);

    const dataset = await waitForDataset(token, upload.body.data._id);

    expect(dataset.errorMessage).toBe(
      'The analysis took too long and was stopped. Try a smaller file.',
    );
    expect(await uploadedFiles()).toEqual([]);
  });

  it('rejects files that are not CSV, and requests with no file', async () => {
    const { token } = await registerUser();
    const wrongType = await uploadCsv(token, 'hello', 'notes.txt').expect(400);
    const noFile = await api()
      .post('/api/v1/datasets')
      .set(bearer(token))
      .expect(400);

    expect(wrongType.body.message).toBe('Only .csv files are accepted');
    expect(noFile.body.message).toBe('A CSV file is required');
    expect(await uploadedFiles()).toEqual([]);
  });

  it('needs a token to upload', async () => {
    await api()
      .post('/api/v1/datasets')
      .attach('file', Buffer.from(SMALL_CSV), 'data.csv')
      .expect(401);
    expect(await uploadedFiles()).toEqual([]);
  });
});

describe('ownership', () => {
  it("keeps one user's dataset and report hidden from another", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const upload = await uploadCsv(owner.token, SMALL_CSV).expect(202);
    const id = upload.body.data._id;
    await waitForDataset(owner.token, id);

    await api()
      .get(`/api/v1/datasets/${id}`)
      .set(bearer(other.token))
      .expect(404);
    await api()
      .get(`/api/v1/reports/${id}`)
      .set(bearer(other.token))
      .expect(404);
    await api()
      .delete(`/api/v1/datasets/${id}`)
      .set(bearer(other.token))
      .expect(404);
    const list = await api()
      .get('/api/v1/datasets')
      .set(bearer(other.token))
      .expect(200);
    expect(list.body.meta.total).toBe(0);

    await api()
      .get(`/api/v1/datasets/${id}`)
      .set(bearer(owner.token))
      .expect(200);
  });
});

describe('list and delete', () => {
  it('searches by name, paginates and treats search text literally', async () => {
    const { token } = await registerUser();
    for (const name of ['sales 2024.csv', 'sales (old).csv', 'weather.csv']) {
      const upload = await uploadCsv(token, SMALL_CSV, name).expect(202);
      await waitForDataset(token, upload.body.data._id);
    }

    const search = await api()
      .get('/api/v1/datasets?searchTerm=SALES&limit=1&page=2')
      .set(bearer(token))
      .expect(200);
    expect(search.body.meta).toEqual({ page: 2, limit: 1, total: 2 });
    expect(search.body.data).toHaveLength(1);

    const literal = await api()
      .get('/api/v1/datasets?searchTerm=(old)')
      .set(bearer(token))
      .expect(200);
    expect(literal.body.data.map((d: { name: string }) => d.name)).toEqual([
      'sales (old).csv',
    ]);

    await api()
      .get('/api/v1/datasets?limit=500')
      .set(bearer(token))
      .expect(400);
  });

  it('deletes the dataset together with its report', async () => {
    const { token } = await registerUser();
    const upload = await uploadCsv(token, SMALL_CSV).expect(202);
    const id = upload.body.data._id;
    await waitForDataset(token, id);

    await api().delete(`/api/v1/datasets/${id}`).set(bearer(token)).expect(200);

    await api().get(`/api/v1/datasets/${id}`).set(bearer(token)).expect(404);
    await api().get(`/api/v1/reports/${id}`).set(bearer(token)).expect(404);
  });
});

describe('rate limit', () => {
  it('allows 10 uploads per user, then answers 429', async () => {
    const { token } = await registerUser();
    const ids: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const upload = await uploadCsv(token, SMALL_CSV).expect(202);
      ids.push(upload.body.data._id);
    }

    const blocked = await uploadCsv(token, SMALL_CSV).expect(429);
    expect(blocked.body.success).toBe(false);

    const other = await registerUser();
    const otherUpload = await uploadCsv(other.token, SMALL_CSV).expect(202);

    await Promise.all(ids.map((id) => waitForDataset(token, id)));
    await waitForDataset(other.token, otherUpload.body.data._id);
    expect(await uploadedFiles()).toHaveLength(0);
  });
});
