import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { LessonProgress } from '../models/LessonProgress';
import { User, IUser } from '../models/User';
import { LESSONS, TRACKS } from '../data/lessons';

const router = Router();
router.use(requireAuth);

const BADGE_THRESHOLDS: Record<number, string> = {
  1: 'first-lesson',
  5: 'five-lessons',
  10: 'ten-lessons',
  25: 'scholar',
  50: 'graduate',
};

/* GET /api/learn/tracks — all tracks */
router.get('/tracks', (_req, res) => {
  res.json({ tracks: TRACKS });
});

/* GET /api/learn/lessons — all lessons + user's completion status */
router.get('/lessons', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const completed = await LessonProgress.find({ user: user.id }).lean();
    const completedIds = new Set(completed.map((c) => c.lessonId));

    res.json({
      tracks: TRACKS,
      lessons: LESSONS.map((l) => ({
        id: l.id,
        trackId: l.trackId,
        title: l.title,
        subtitle: l.subtitle,
        emoji: l.emoji,
        readingMinutes: l.readingMinutes,
        type: l.type || 'lesson',
        completed: completedIds.has(l.id),
      })),
      completedCount: completedIds.size,
      totalCount: LESSONS.length,
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/learn/lessons/:id — full lesson content */
router.get('/lessons/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const lesson = LESSONS.find((l) => l.id === req.params.id);
    if (!lesson) return void res.status(404).json({ error: 'Lesson not found.' });

    const done = await LessonProgress.exists({ user: user.id, lessonId: lesson.id });

    res.json({ lesson, completed: !!done });
  } catch (err) {
    next(err);
  }
});

/* POST /api/learn/lessons/:id/complete */
router.post('/lessons/:id/complete', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const lesson = LESSONS.find((l) => l.id === req.params.id);
    if (!lesson) return void res.status(404).json({ error: 'Lesson not found.' });

    // Upsert progress record
    await LessonProgress.findOneAndUpdate(
      { user: user.id, lessonId: lesson.id },
      { completedAt: new Date() },
      { upsert: true }
    );

    // Update streak
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastAt = user.lastLessonAt;
    let streak = user.lessonStreak || 0;

    if (!lastAt) {
      streak = 1;
    } else {
      const daysSince = Math.floor((now.getTime() - lastAt.getTime()) / 86_400_000);
      if (daysSince <= 1) streak += 1;
      else streak = 1;
    }

    user.lastLessonAt = now;
    user.lessonStreak = streak;

    // Award badges
    const completedCount = await LessonProgress.countDocuments({ user: user.id });
    const badgeId = BADGE_THRESHOLDS[completedCount];
    if (badgeId && !user.badges.includes(badgeId)) {
      user.badges.push(badgeId);
    }
    if (streak >= 7 && !user.badges.includes('week-streak')) {
      user.badges.push('week-streak');
    }

    await user.save();

    res.json({ ok: true, streak, completedCount, newBadge: badgeId || null });
  } catch (err) {
    next(err);
  }
});

/* GET /api/learn/progress */
router.get('/progress', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const completedCount = await LessonProgress.countDocuments({ user: user.id });
    res.json({
      streak: user.lessonStreak || 0,
      lastLessonAt: user.lastLessonAt?.toISOString() || null,
      completedCount,
      totalCount: LESSONS.length,
      badges: user.badges || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
