import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IHolding {
  ticker: string;
  shares: number;
  avgCost: number;
}

export interface ISimulatorPortfolio extends Document {
  user: mongoose.Types.ObjectId;
  cash: number;
  holdings: IHolding[];
  startingBalance: number;
  season: string; // YYYY-MM
  resetAt: Date;
  createdAt: Date;
}

const HoldingSchema = new Schema<IHolding>(
  {
    ticker: { type: String, required: true, uppercase: true },
    shares: { type: Number, required: true, min: 0 },
    avgCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SimulatorPortfolioSchema = new Schema<ISimulatorPortfolio>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    cash: { type: Number, default: 10_000 },
    holdings: { type: [HoldingSchema], default: [] },
    startingBalance: { type: Number, default: 10_000 },
    season: { type: String, default: () => new Date().toISOString().slice(0, 7) },
    resetAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const SimulatorPortfolio: Model<ISimulatorPortfolio> =
  mongoose.model<ISimulatorPortfolio>('SimulatorPortfolio', SimulatorPortfolioSchema);
