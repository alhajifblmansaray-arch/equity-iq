import mongoose, { Document, Model, Schema } from 'mongoose';

export type AlertType = 'price' | 'rsi_above' | 'rsi_below' | 'macd_bullish' | 'macd_bearish' | 'vol_spike';

export interface IAlert extends Document {
  user: mongoose.Types.ObjectId;
  ticker: string;
  alertType: AlertType;
  condition: 'above' | 'below';
  price: number;
  threshold: number;       // RSI level for rsi_* alerts; unused for macd/price
  active: boolean;
  triggeredAt?: Date;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticker:    { type: String, required: true, uppercase: true, trim: true, index: true },
    alertType: { type: String, enum: ['price','rsi_above','rsi_below','macd_bullish','macd_bearish','vol_spike'], default: 'price' },
    condition: { type: String, enum: ['above', 'below'], required: true },
    price:     { type: Number, default: 0, min: 0 },
    threshold: { type: Number, default: 0 },
    active:    { type: Boolean, default: true, index: true },
    triggeredAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const Alert: Model<IAlert> = mongoose.model<IAlert>('Alert', AlertSchema);
