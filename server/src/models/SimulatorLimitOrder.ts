import mongoose, { Document, Model, Schema } from 'mongoose';

export type LimitOrderAction = 'buy' | 'sell';
export type LimitOrderType = 'limit' | 'stop'; // limit = profit target / entry; stop = stop-loss / breakout
export type LimitOrderStatus = 'pending' | 'filled' | 'cancelled';

export interface ISimulatorLimitOrder extends Document {
  user: mongoose.Types.ObjectId;
  ticker: string;
  action: LimitOrderAction;
  orderType: LimitOrderType;
  shares: number;
  limitPrice: number;
  status: LimitOrderStatus;
  filledPrice?: number;
  filledAt?: Date;
  note?: string;
  season: string;
  expiresAt: Date;
  createdAt: Date;
}

const schema = new Schema<ISimulatorLimitOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticker: { type: String, required: true, uppercase: true },
    action: { type: String, enum: ['buy', 'sell'], required: true },
    orderType: { type: String, enum: ['limit', 'stop'], required: true },
    shares: { type: Number, required: true, min: 1 },
    limitPrice: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: ['pending', 'filled', 'cancelled'], default: 'pending' },
    filledPrice: Number,
    filledAt: Date,
    note: String,
    season: { type: String, default: () => new Date().toISOString().slice(0, 7) },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

schema.index({ status: 1, expiresAt: 1 });

export const SimulatorLimitOrder: Model<ISimulatorLimitOrder> =
  mongoose.model<ISimulatorLimitOrder>('SimulatorLimitOrder', schema);
