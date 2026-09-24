import { Schema, model, Document, Types } from 'mongoose';

export interface IEndpoint extends Document {
  _id: Types.ObjectId;
  userId: string;
  projectName: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  expectedStatusCode: number;
  checkIntervalMinutes: number;
  batchId: string;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  lastCheckedAt?: Date;
  nextCheckAt?: Date;
  lastResponseTimeMs?: number;
  lastStatusCode?: number;
  createdAt: Date;
  updatedAt: Date;
}

const endpointSchema = new Schema<IEndpoint>(
  {
    userId: { type: String, required: true, index: true },
    projectName: { type: String, required: true, index: true },
    url: { type: String, required: true },
    method: { type: String, enum: ['GET', 'POST', 'HEAD'], default: 'GET' },
    headers: { type: Schema.Types.Mixed, default: {} },
    expectedStatusCode: { type: Number, default: 200 },
    checkIntervalMinutes: { type: Number, enum: [5, 10, 15], default: 5 },
    batchId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'down', 'pending'],
      default: 'pending',
    },
    lastCheckedAt: { type: Date },
    nextCheckAt: { type: Date, index: true },
    lastResponseTimeMs: { type: Number },
    lastStatusCode: { type: Number },
  },
  {
    timestamps: true,
  }
);

// Compound index for O(log N) scheduler fallback lookups
endpointSchema.index({ nextCheckAt: 1, status: 1 });
// Compound index for O(log N) user endpoint listings
endpointSchema.index({ userId: 1, createdAt: -1 });

// Helper function to extract project name / domain from URL if not provided
export function extractProjectName(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2].toUpperCase();
    }
    return hostname.toUpperCase();
  } catch {
    return 'DEFAULT_PROJECT';
  }
}

export const EndpointModel = model<IEndpoint>('Endpoint', endpointSchema);
