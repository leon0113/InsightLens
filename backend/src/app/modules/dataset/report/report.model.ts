import { Schema, model } from 'mongoose';
import { IReport, ReportModel } from './report.interface';

// `content` is the engine's JSON as-is. It is validated with Zod before saving,
// so Mongoose stores it without a schema of its own.
const reportSchema = new Schema<IReport, ReportModel>(
  {
    dataset: {
      type: Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true,
      unique: true,
    },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);

export const Report = model<IReport, ReportModel>('Report', reportSchema);
