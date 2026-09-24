import { Schema, model, Document, Types } from 'mongoose';

export interface IIncident extends Document {
  _id: Types.ObjectId;
  endpointId: Types.ObjectId;
  userId: string;
  projectName: string;
  url: string;
  errorType: 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_STATUS';
  statusCode?: number;
  errorMessage: string;
  responseTimeMs?: number;
  responseSnippet?: string;
  startedAt: Date;
  lastSeenAt: Date;
  durationSeconds: number;
  resolved: boolean;
  resolvedAt?: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    endpointId: { type: Schema.Types.ObjectId, ref: 'Endpoint', required: true, index: true },
    userId: { type: String, required: true, index: true },
    projectName: { type: String, required: true, index: true },
    url: { type: String, required: true },
    errorType: {
      type: String,
      enum: ['HTTP_ERROR', 'TIMEOUT', 'NETWORK_ERROR', 'INVALID_STATUS'],
      required: true,
    },
    statusCode: { type: Number },
    errorMessage: { type: String, required: true },
    responseTimeMs: { type: Number },
    responseSnippet: { type: String },
    startedAt: { type: Date, required: true, default: Date.now, index: true },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    durationSeconds: { type: Number, default: 0 },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for O(1) active incident fallback lookups when Redis is down
incidentSchema.index({ endpointId: 1, resolved: 1 });
// Compound index for O(log N) incident history queries
incidentSchema.index({ userId: 1, startedAt: -1 });

export const IncidentModel = model<IIncident>('Incident', incidentSchema);
