import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISimulatorTrade extends Document {
  user: mongoose.Types.ObjectId;
  ticker: string;
  action: 'buy' | 'sell' | 'short' | 'cover';
  shares: number;
  price: number;
  total: number;
  pnl: number | null;
  pnlPct: number | null;
  aiDebrief: string | null;
  note: string | null;
  season: string;
  createdAt: Date;
}

const SimulatorTradeSchema = new Schema<ISimulatorTrade>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticker: { type: String, required: true, uppercase: true },
    action: { type: String, enum: ['buy', 'sell', 'short', 'cover'], required: true },
    shares: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    pnl: { type: Number, default: null },
    pnlPct: { type: Number, default: null },
    aiDebrief: { type: String, default: null },
    note: { type: String, default: null },
    season: { type: String, default: () => new Date().toISOString().slice(0, 7) },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const SimulatorTrade: Model<ISimulatorTrade> =
  mongoose.model<ISimulatorTrade>('SimulatorTrade', SimulatorTradeSchema);
