import { Document, model, Schema } from 'mongoose';

export interface ISimulatorSnapshot extends Document {
  user: Schema.Types.ObjectId;
  date: string; // YYYY-MM-DD
  totalValue: number;
  cash: number;
  investedValue: number;
}

const schema = new Schema<ISimulatorSnapshot>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  totalValue: { type: Number, required: true },
  cash: { type: Number, default: 0 },
  investedValue: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ user: 1, date: 1 }, { unique: true });

export const SimulatorSnapshot = model<ISimulatorSnapshot>('SimulatorSnapshot', schema);
