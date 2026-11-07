import { Model, Types } from 'mongoose';

export enum DATASET_STATUS {
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

export interface IDataset {
  name: string;
  sizeBytes: number;
  status: DATASET_STATUS;
  errorMessage?: string;
  rowCount?: number;
  columnCount?: number;
  owner: Types.ObjectId;
}

export type DatasetModel = Model<IDataset>;

export type IDatasetFilters = {
  searchTerm?: string;
  status?: string;
};
