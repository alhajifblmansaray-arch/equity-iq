import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User, IUser } from '../models/User';

export function configurePassport(): void {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user || false);
    } catch (err) {
      done(err as Error);
    }
  });

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.passwordHash) {
          return done(null, false, { message: 'Invalid email or password.' });
        }
        const ok = await user.comparePassword(password);
        if (!ok) return done(null, false, { message: 'Invalid email or password.' });
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    })
  );

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) return done(new Error('Google profile has no email.'));

            let user: IUser | null = await User.findOne({ googleId: profile.id });
            if (!user) {
              user = await User.findOne({ email });
              if (user) {
                user.googleId = profile.id;
                if (!user.avatarUrl) user.avatarUrl = profile.photos?.[0]?.value;
                await user.save();
              } else {
                user = await User.create({
                  email,
                  name: profile.displayName || email.split('@')[0],
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                });
              }
            }
            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }
}

export const googleEnabled = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
