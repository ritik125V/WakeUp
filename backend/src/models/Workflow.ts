import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkflowVariableExtract {
  varName: string;
  jsonPath: string;
}

export interface IWorkflowStep {
  stepId: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyPayload?: string;
  expectedStatusCode?: number;
  captureCookies?: boolean;
  carryCookies?: boolean;
  skipped?: boolean;
  extractVariables?: IWorkflowVariableExtract[];
}

export interface IWorkflow extends Document {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  description?: string;
  steps: IWorkflowStep[];
  githubEnabled?: boolean;
  githubRepo?: string;
  githubBranch?: string;
  githubSecretToken?: string;
  notificationEmail?: string;
  lastTriggeredBy?: string;
  lastTriggeredAt?: Date;
  lastRunStatus?: 'success' | 'failed' | 'pending' | 'none';
  createdAt: Date;
  updatedAt: Date;
}

const workflowStepSchema = new Schema<IWorkflowStep>(
  {
    stepId: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
      default: 'GET',
    },
    headers: { type: Schema.Types.Mixed, default: {} },
    queryParams: { type: Schema.Types.Mixed, default: {} },
    bodyPayload: { type: String, default: '' },
    expectedStatusCode: { type: Number, default: 200 },
    captureCookies: { type: Boolean, default: true },
    carryCookies: { type: Boolean, default: true },
    skipped: { type: Boolean, default: false },
    extractVariables: [
      {
        varName: { type: String, required: true },
        jsonPath: { type: String, required: true },
      },
    ],
  },
  { _id: false }
);

const workflowSchema = new Schema<IWorkflow>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    steps: [workflowStepSchema],
    githubEnabled: { type: Boolean, default: false },
    githubRepo: { type: String, default: '' },
    githubBranch: { type: String, default: 'main' },
    githubSecretToken: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    },
    notificationEmail: { type: String, default: '' },
    lastTriggeredBy: { type: String, default: '' },
    lastTriggeredAt: { type: Date },
    lastRunStatus: { type: String, default: 'none' },
  },
  {
    timestamps: true,
  }
);

export const WorkflowModel = model<IWorkflow>('Workflow', workflowSchema);
