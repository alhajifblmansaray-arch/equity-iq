import mongoose, { Document, Schema } from 'mongoose';

export interface ISnaptradeAuth extends Document {
  user: mongoose.Types.ObjectId;
  snaptradeUserId: string;
  snaptradeUserSecret: string;
  connectedAt: Date;
  lastSyncAt?: Date;
  isConnected: boolean;
}

const SnaptradeAuthSchema = new Schema<ISnaptradeAuth>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    snaptradeUserId: { type: String, required: true },
    snaptradeUserSecret: { type: String, required: true },
    connectedAt: { type: Date, default: () => new Date() },
    lastSyncAt: { type: Date },
    isConnected: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SnaptradeAuth = mongoose.models.SnaptradeAuth as mongoose.Model<ISnaptradeAuth>
  || mongoose.model<ISnaptradeAuth>('SnaptradeAuth', SnaptradeAuthSchema);

export default SnaptradeAuth;
