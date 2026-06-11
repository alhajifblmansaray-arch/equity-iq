import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserGoal = 'learn' | 'save' | 'understand' | 'trade';
export type UserMode = 'beginner' | 'intermediate' | 'advanced';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  watchlist: string[];
  goal?: UserGoal;
  mode: UserMode;
  badges: string[];
  lessonStreak: number;
  lastLessonAt?: Date;
  createdAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, index: true, sparse: true },
    avatarUrl: { type: String },
    watchlist: { type: [String], default: [] },
    goal: { type: String, enum: ['learn', 'save', 'understand', 'trade'] },
    mode: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    badges: { type: [String], default: [] },
    lessonStreak: { type: Number, default: 0 },
    lastLessonAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.statics.hashPassword = function (plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
};

export interface UserModel extends Model<IUser> {
  hashPassword(plain: string): Promise<string>;
}

export const User = mongoose.model<IUser, UserModel>('User', UserSchema);
