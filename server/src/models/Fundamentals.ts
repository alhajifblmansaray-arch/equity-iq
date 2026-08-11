import mongoose, { Document, Schema } from 'mongoose';

/**
 * Persisted fundamentals cache.
 *
 * Alpha Vantage's free tier allows 25 requests a day. An in-memory cache alone
 * means every restart or cold start re-spends that budget, and on a host that
 * sleeps when idle the data would essentially never be there. Storing it keeps
 * the quota spent once per ticker per day, shared across restarts and instances.
 */
export interface IFundamentals extends Document {
  ticker: string;
  data: Record<string, unknown>;
  /** True once a provider returned real ratios, not just a profile. */
  complete: boolean;
  fetchedAt: Date;
}

const FundamentalsSchema = new Schema<IFundamentals>({
  ticker: { type: String, required: true, unique: true, uppercase: true, index: true },
  data: { type: Schema.Types.Mixed, required: true },
  complete: { type: Boolean, default: false },
  fetchedAt: { type: Date, default: () => new Date(), index: true },
});

const Fundamentals =
  (mongoose.models.Fundamentals as mongoose.Model<IFundamentals>) ||
  mongoose.model<IFundamentals>('Fundamentals', FundamentalsSchema);

export default Fundamentals;
