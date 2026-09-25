import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookLog extends Document {
  _id: Types.ObjectId;
  githubEvent: string;
  repoFullName: string;
  branch: string;
  commitHash: string;
  commitMsg: string;
  author: string;
  authorEmail: string;
  tokenQuery: string;
  clientIp: string;
  headersSnippet: Record<string, any>;
  bodySnippet: string;
  status: 'SUCCESS' | 'UNBOUND' | 'ERROR' | 'PING';
  matchedWorkflowCount: number;
  matchedWorkflowIds: string[];
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookLogSchema = new Schema<IWebhookLog>(
  {
    githubEvent: { type: String, default: 'push' },
    repoFullName: { type: String, default: '', index: true },
    branch: { type: String, default: 'main' },
    commitHash: { type: String, default: '' },
    commitMsg: { type: String, default: '' },
    author: { type: String, default: '' },
    authorEmail: { type: String, default: '' },
    tokenQuery: { type: String, default: '' },
    clientIp: { type: String, default: '' },
    headersSnippet: { type: Schema.Types.Mixed, default: {} },
    bodySnippet: { type: String, default: '' },
    status: {
      type: String,
      enum: ['SUCCESS', 'UNBOUND', 'ERROR', 'PING'],
      default: 'UNBOUND',
      index: true,
    },
    matchedWorkflowCount: { type: Number, default: 0 },
    matchedWorkflowIds: [{ type: String }],
    receivedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

webhookLogSchema.index({ receivedAt: -1 });
webhookLogSchema.index({ repoFullName: 1, receivedAt: -1 });

export const WebhookLogModel = model<IWebhookLog>('WebhookLog', webhookLogSchema);
