import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransaction {
  _id?: Types.ObjectId;
  date: Date;
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';
  ticker?: string;
  quantity?: number;
  price?: number;
  amount: number; // total CAD/USD value
  currency: 'CAD' | 'USD';
  note?: string;
}

export interface IHolding {
  _id?: Types.ObjectId;
  ticker: string;
  quantity: number;
  avgCost: number;
  currency: 'CAD' | 'USD';
  account: string;
}

export interface IPortfolio extends Document {
  user: mongoose.Types.ObjectId;
  accounts: string[]; // ['RRSP', 'TFSA', 'Cash', ...]
  cash: number; // total cash available (display currency)
  cashCurrency: 'CAD' | 'USD';
  holdings: Types.DocumentArray<IHolding>;
  transactions: Types.DocumentArray<ITransaction>;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: ['buy', 'sell', 'dividend', 'deposit', 'withdrawal'], required: true },
    ticker: { type: String, uppercase: true },
    quantity: { type: Number },
    price: { type: Number },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['CAD', 'USD'], default: 'USD' },
    note: { type: String },
  },
  { _id: true }
);

const HoldingSchema = new Schema<IHolding>(
  {
    ticker: { type: String, required: true, uppercase: true },
    quantity: { type: Number, required: true },
    avgCost: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['CAD', 'USD'], default: 'USD' },
    account: { type: String, required: true },
  },
  { _id: true }
);

const PortfolioSchema = new Schema<IPortfolio>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    accounts: { type: [String], default: ['RRSP', 'TFSA', 'Cash'] },
    cash: { type: Number, default: 0 },
    cashCurrency: { type: String, enum: ['CAD', 'USD'], default: 'USD' },
    holdings: { type: [HoldingSchema], default: [] },
    transactions: { type: [TransactionSchema], default: [] },
  },
  { timestamps: true }
);

const Portfolio = mongoose.models.Portfolio as mongoose.Model<IPortfolio>
  || mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);

export default Portfolio;
