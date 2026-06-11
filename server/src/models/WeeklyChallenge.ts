import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IChallengePick {
  user: mongoose.Types.ObjectId;
  direction: 'up' | 'down';
  startPrice: number;
  createdAt: Date;
  result: 'correct' | 'incorrect' | null;
}

export interface IWeeklyChallenge extends Document {
  week: string; // YYYY-WNN
  ticker: string;
  startPrice: number;
  endPrice: number | null;
  picks: IChallengePick[];
  resolved: boolean;
}

const ChallengePickSchema = new Schema<IChallengePick>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    direction: { type: String, enum: ['up', 'down'], required: true },
    startPrice: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    result: { type: String, enum: ['correct', 'incorrect', null], default: null },
  },
  { _id: false }
);

const WeeklyChallengeSchema = new Schema<IWeeklyChallenge>({
  week: { type: String, required: true, unique: true, index: true },
  ticker: { type: String, required: true },
  startPrice: { type: Number, required: true },
  endPrice: { type: Number, default: null },
  picks: { type: [ChallengePickSchema], default: [] },
  resolved: { type: Boolean, default: false },
});

export const WeeklyChallenge: Model<IWeeklyChallenge> =
  mongoose.model<IWeeklyChallenge>('WeeklyChallenge', WeeklyChallengeSchema);
