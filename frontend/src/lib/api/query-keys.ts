import type { DatasetListParams } from './types';

// Every cache key in one place. Keys are nested, so invalidating
// ['datasets', 'list'] refreshes every page and search of the dataset list.
export const queryKeys = {
  datasets: ['datasets'] as const,
  datasetLists: ['datasets', 'list'] as const,
  datasetList: (params: DatasetListParams) =>
    ['datasets', 'list', params] as const,
  dataset: (id: string) => ['datasets', 'detail', id] as const,
  report: (datasetId: string) => ['reports', datasetId] as const,
  demoReport: (slug: string) => ['demo-reports', slug] as const,
};
