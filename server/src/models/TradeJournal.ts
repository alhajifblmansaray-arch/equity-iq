import mongoose, { Document, Model, Schema } from 'mongoose';

export type AssetType = 'stock' | 'option' | 'etf' | 'crypto';
export type Direction = 'long' | 'short';
export type SetupTag =
  | 'breakout' | 'earnings_play' | 'dip_buy' | 'momentum'
  | 'mean_reversion' | 'options_income' | 'swing' | 'scalp' | 'macro';
export type CatalystTag =
  | 'earnings' | 'news' | 'technical_level' | 'macro'
  | 'insider_activity' | 'social_sentiment' | 'analyst_upgrade' | 'sector_rotation';
export type MistakeTag =
  | 'fomo_entry' | 'revenge_trade' | 'ignored_stop' | 'oversized_position'
  | 'no_thesis' | 'held_too_long' | 'sold_too_early' | 'chased_entry';
export type EmotionalState = 'calm' | 'confident' | 'anxious' | 'uncertain' | 'impatient' | 'euphoric';
export type ConvictionLevel = 1 | 2 | 3 | 4 | 5;

export interface ITradeJournal extends Document {
  user: mongoose.Types.ObjectId;
  ticker: string;
  direction: Direction;
  assetType: AssetType;
  status: 'open' | 'closed';

  // Entry
  entryDate: Date;
  thesis: string;
  setupTags: SetupTag[];
  catalystTags: CatalystTag[];
  emotionalStateEntry: EmotionalState;
  convictionLevel: ConvictionLevel;
  stopLoss?: number;
  targetPrice?: number;

  // Stock-specific
  stockDetails?: {
    entryPrice: number;
    exitPrice?: number;
    shares: number;
  };

  // Option-specific
  optionDetails?: {
    contractType: 'call' | 'put';
    strike: number;
    expiry: string;
    contracts: number;
    multiplier: number; // usually 100
    entryPremium: number;  // price PAID per share basis (e.g. 0.45)
    exitPremium?: number;  // price RECEIVED per share basis
    underlyingPriceAtEntry?: number; // reference only — NOT used in P&L
    underlyingPriceAtExit?: number;
    ivEntry?: number;
    ivExit?: number;
    deltaEntry?: number;
    thetaEntry?: number;
    dteEntry?: number;
  };

  // Auto-captured at entry time
  technicalSnapshotEntry?: {
    price: number;
    rsi?: number;
    sma50?: number;
    sma200?: number;
    macdHistogram?: number;
  };

  // Links to existing EquityIQ data
  linkedResearchId?: string;
  linkedForecastId?: string;
  linkedAlertId?: string;
  agreedWithForecast?: boolean | null; // did you agree with the AI forecast?

  // Exit
  exitPrice?: number;
  exitDate?: Date;
  fees?: number;
  emotionalStateExit?: EmotionalState;
  exitReason?: string;
  mistakeTags?: MistakeTag[];

  // Computed on exit
  realizedPnl?: number;
  realizedPnlPct?: number;
  rMultiple?: number; // (exit - entry) / (entry - stop)
  holdingPeriodDays?: number;

  // Review
  didFollowThesis?: boolean;
  reviewNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TradeJournalSchema = new Schema<ITradeJournal>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticker: { type: String, required: true, uppercase: true, trim: true, index: true },
    direction: { type: String, enum: ['long', 'short'], required: true },
    assetType: { type: String, enum: ['stock', 'option', 'etf', 'crypto'], default: 'stock' },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },

    entryDate: { type: Date, required: true },
    thesis: { type: String, default: '' },
    setupTags: [{ type: String }],
    catalystTags: [{ type: String }],
    emotionalStateEntry: { type: String, default: 'calm' },
    convictionLevel: { type: Number, min: 1, max: 5, default: 3 },
    stopLoss: Number,
    targetPrice: Number,

    stockDetails: {
      entryPrice: Number,
      exitPrice: Number,
      shares: Number,
    },

    optionDetails: {
      contractType: { type: String, enum: ['call', 'put'] },
      strike: Number,
      expiry: String,
      contracts: Number,
      multiplier: { type: Number, default: 100 },
      entryPremium: Number,
      exitPremium: Number,
      underlyingPriceAtEntry: Number,
      underlyingPriceAtExit: Number,
      ivEntry: Number,
      ivExit: Number,
      deltaEntry: Number,
      thetaEntry: Number,
      dteEntry: Number,
    },

    technicalSnapshotEntry: {
      price: Number,
      rsi: Number,
      sma50: Number,
      sma200: Number,
      macdHistogram: Number,
    },

    linkedResearchId: String,
    linkedForecastId: String,
    linkedAlertId: String,
    agreedWithForecast: { type: Boolean, default: null },

    exitPrice: Number,
    exitDate: Date,
    fees: { type: Number, default: 0 },
    emotionalStateExit: String,
    exitReason: String,
    mistakeTags: [{ type: String }],

    realizedPnl: Number,
    realizedPnlPct: Number,
    rMultiple: Number,
    holdingPeriodDays: Number,

    didFollowThesis: Boolean,
    reviewNotes: String,
  },
  { timestamps: true }
);

export const TradeJournal: Model<ITradeJournal> = mongoose.model<ITradeJournal>('TradeJournal', TradeJournalSchema);
