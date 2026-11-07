import { Model, Types } from 'mongoose';
import { IAnalysisReport } from '../../../../helpers/reportSchema';

export interface IReport {
  dataset: Types.ObjectId;
  owner: Types.ObjectId;
  content: IAnalysisReport;
}

export type ReportModel = Model<IReport>;

export type IDemoDataset = {
  slug: string;
  title: string;
  description: string;
  fileName: string;
};
