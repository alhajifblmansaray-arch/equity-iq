import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILessonProgress extends Document {
  user: mongoose.Types.ObjectId;
  lessonId: string;
  completedAt: Date;
}

const LessonProgressSchema = new Schema<ILessonProgress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonId: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

LessonProgressSchema.index({ user: 1, lessonId: 1 }, { unique: true });

export const LessonProgress: Model<ILessonProgress> =
  mongoose.model<ILessonProgress>('LessonProgress', LessonProgressSchema);
