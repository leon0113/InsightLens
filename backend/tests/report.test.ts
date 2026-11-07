import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { reportSchema } from '../src/helpers/reportSchema';
import { api } from './helpers';

describe('report contract', () => {
  it('accepts the example in docs/report_schema.md', () => {
    const doc = fs.readFileSync(
      path.join('..', 'docs', 'report_schema.md'),
      'utf8',
    );
    const example = JSON.parse(doc.match(/```json\n([\s\S]*?)```/)![1]);

    expect(reportSchema.safeParse(example).success).toBe(true);
  });

  it('rejects a report that breaks the contract', () => {
    const doc = fs.readFileSync(
      path.join('..', 'docs', 'report_schema.md'),
      'utf8',
    );
    const example = JSON.parse(doc.match(/```json\n([\s\S]*?)```/)![1]);
    example.overview.missingPercent = 140;

    expect(reportSchema.safeParse(example).success).toBe(false);
  });
});

describe('public demo reports', () => {
  it('lists the three sample datasets without a token', async () => {
    const res = await api().get('/api/v1/reports/demo').expect(200);

    expect(res.body.data.map((d: { slug: string }) => d.slug)).toEqual([
      'ecommerce-orders',
      'clinic-appointments',
      'sensor-readings',
    ]);
    expect(res.body.data[1]).toMatchObject({ rowCount: 3000, columnCount: 13 });
  });

  it('serves one demo report without a token', async () => {
    const res = await api()
      .get('/api/v1/reports/demo/sensor-readings')
      .expect(200);

    expect(res.body.data.dataset.name).toBe('sensor_readings.csv');
    expect(res.body.data.report.source).toMatchObject({
      encoding: 'cp1252',
      delimiter: ';',
      skippedLineCount: 12,
    });
  });

  it('answers 404 for an unknown demo and 400 for a malformed name', async () => {
    await api().get('/api/v1/reports/demo/unknown').expect(404);
    await api().get('/api/v1/reports/demo/Bad_Name!').expect(400);
  });
});
