import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * One row per (forecast, horizon). We store the prediction at creation time, then
 * a background job resolves it once the horizon matures by comparing against the
 * realized price. The resolved history is fed back into future prompts so the
 * model can calibrate — a feedback loop standing in for true online learning.
 */
export interface IForecastLog extends Document {
  ticker: string;
  horizon: '1H' | '1D' | '3D' | '1W';
  asOf: Date;
  basePrice: number;
  direction: 'up' | 'down' | 'flat';
  expectedMovePct: number;
  probabilityUp: number;
  confidence: 'low' | 'medium' | 'high';
  rangeLow: number;
  rangeBase: number;
  rangeHigh: number;
  resolveAt: Date;
  resolved: boolean;
  actualPrice?: number;
  actualMovePct?: number;
  directionHit?: boolean;
  withinRange?: boolean;
  createdAt: Date;
}

const ForecastLogSchema = new Schema<IForecastLog>(
  {
    ticker: { type: String, required: true, uppercase: true, trim: true, index: true },
    horizon: { type: String, enum: ['1H', '1D', '3D', '1W'], required: true },
    asOf: { type: Date, required: true },
    basePrice: { type: Number, required: true },
    direction: { type: String, enum: ['up', 'down', 'flat'], required: true },
    expectedMovePct: { type: Number, required: true },
    probabilityUp: { type: Number, required: true },
    confidence: { type: String, enum: ['low', 'medium', 'high'], required: true },
    rangeLow: { type: Number, required: true },
    rangeBase: { type: Number, required: true },
    rangeHigh: { type: Number, required: true },
    resolveAt: { type: Date, required: true, index: true },
    resolved: { type: Boolean, default: false, index: true },
    actualPrice: { type: Number },
    actualMovePct: { type: Number },
    directionHit: { type: Boolean },
    withinRange: { type: Boolean },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const ForecastLog: Model<IForecastLog> =
  mongoose.model<IForecastLog>('ForecastLog', ForecastLogSchema);
