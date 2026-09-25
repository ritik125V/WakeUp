import { Schema, model, Document, Types } from 'mongoose';
import { IStepLogTelemetry } from '../services/workflowRunner';

export interface ICommitInfo {
  commitMsg?: string;
  author?: string;
  authorEmail?: string;
  commitHash?: string;
  repo?: string;
  branch?: string;
}

export interface IWorkflowRunSummary {
  totalSteps: number;
  successSteps: number;
  failedSteps: number;
  totalTimeMs: number;
  overallStatus: 'success' | 'failed';
  startedAt: Date;
  finishedAt: Date;
}

export interface IWorkflowRun extends Document {
  _id: Types.ObjectId;
  workflowId: Types.ObjectId | string;
  userId: string;
  workflowName: string;
  triggerSource: 'github_commit' | 'manual' | 'browser_direct' | 'api';
  githubRepo?: string;
  githubBranch?: string;
  commitInfo?: ICommitInfo;
  summary: IWorkflowRunSummary;
  stepLogs: IStepLogTelemetry[];
  createdAt: Date;
  updatedAt: Date;
}

const commitInfoSchema = new Schema<ICommitInfo>(
  {
    commitMsg: { type: String, default: '' },
    author: { type: String, default: '' },
    authorEmail: { type: String, default: '' },
    commitHash: { type: String, default: '' },
    repo: { type: String, default: '' },
    branch: { type: String, default: '' },
  },
  { _id: false }
);

const workflowRunSummarySchema = new Schema<IWorkflowRunSummary>(
  {
    totalSteps: { type: Number, required: true, default: 0 },
    successSteps: { type: Number, required: true, default: 0 },
    failedSteps: { type: Number, required: true, default: 0 },
    totalTimeMs: { type: Number, required: true, default: 0 },
    overallStatus: { type: String, enum: ['success', 'failed'], required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    finishedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const workflowRunSchema = new Schema<IWorkflowRun>(
  {
    workflowId: { type: Schema.Types.Mixed, required: true, index: true },
    userId: { type: String, required: true, index: true },
    workflowName: { type: String, required: true },
    triggerSource: {
      type: String,
      enum: ['github_commit', 'manual', 'browser_direct', 'api'],
      default: 'manual',
    },
    githubRepo: { type: String, default: '' },
    githubBranch: { type: String, default: '' },
    commitInfo: { type: commitInfoSchema, default: {} },
    summary: { type: workflowRunSummarySchema, required: true },
    stepLogs: [Schema.Types.Mixed],
  },
  {
    timestamps: true,
  }
);

workflowRunSchema.index({ workflowId: 1, createdAt: -1 });
workflowRunSchema.index({ userId: 1, createdAt: -1 });
workflowRunSchema.index({ createdAt: -1 });

export const WorkflowRunModel = model<IWorkflowRun>('WorkflowRun', workflowRunSchema);
