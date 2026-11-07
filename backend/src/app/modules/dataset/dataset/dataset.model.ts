import { Schema, model } from 'mongoose';
import { DATASET_STATUS, DatasetModel, IDataset } from './dataset.interface';

const datasetSchema = new Schema<IDataset, DatasetModel>(
  {
    name: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(DATASET_STATUS),
      default: DATASET_STATUS.PROCESSING,
    },
    errorMessage: { type: String },
    rowCount: { type: Number },
    columnCount: { type: Number },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Every query filters by owner, and the list is newest first by default.
datasetSchema.index({ owner: 1, createdAt: -1 });

export const Dataset = model<IDataset, DatasetModel>('Dataset', datasetSchema);
