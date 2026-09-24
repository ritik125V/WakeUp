import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  pinHash?: string;
  name?: string;
  avatar?: string;
  provider: 'credentials' | 'google' | 'github';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    pinHash: { type: String },
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    provider: { type: String, enum: ['credentials', 'google', 'github'], default: 'credentials' },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model<IUser>('User', userSchema);
