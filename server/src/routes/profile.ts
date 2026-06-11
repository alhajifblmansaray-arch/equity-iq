import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { User, IUser, UserGoal, UserMode } from '../models/User';

const router = Router();
router.use(requireAuth);

const UPLOAD_DIR = path.join(__dirname, '../../uploads/avatars');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, _file, cb) => {
    const user = req.user as IUser;
    cb(null, `${user.id}.jpg`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

/* PATCH /api/profile — update name, goal, mode */
router.patch('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const { name, goal, mode } = req.body;

    if (name && typeof name === 'string') user.name = name.trim().slice(0, 60);
    if (goal && ['learn', 'save', 'understand', 'trade'].includes(goal))
      user.goal = goal as UserGoal;
    if (mode && ['beginner', 'intermediate', 'advanced'].includes(mode))
      user.mode = mode as UserMode;

    await user.save();
    res.json({ ok: true, user: sanitize(user) });
  } catch (err) {
    next(err);
  }
});

/* POST /api/profile/avatar — upload profile picture */
router.post('/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    const user = req.user as IUser;
    if (!req.file) return void res.status(400).json({ error: 'No file uploaded.' });

    const avatarUrl = `/uploads/avatars/${user.id}.jpg?v=${Date.now()}`;
    user.avatarUrl = avatarUrl;
    await user.save();

    res.json({ ok: true, avatarUrl });
  } catch (err) {
    next(err);
  }
});

function sanitize(u: IUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl || null,
    goal: u.goal || null,
    mode: u.mode || 'beginner',
    badges: u.badges || [],
    lessonStreak: u.lessonStreak || 0,
    watchlist: u.watchlist,
    createdAt: u.createdAt.toISOString(),
  };
}

export default router;
