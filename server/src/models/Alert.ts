import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAlert extends Document {
  user: mongoose.Types.ObjectId;
  ticker: string;
  condition: 'above' | 'below';
  price: number;
  active: boolean;
  triggeredAt?: Date;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticker: { type: String, required: true, uppercase: true, trim: true, index: true },
    condition: { type: String, enum: ['above', 'below'], required: true },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true, index: true },
    triggeredAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const Alert: Model<IAlert> = mongoose.model<IAlert>('Alert', AlertSchema);
