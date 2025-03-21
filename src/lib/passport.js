const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {       

        let user = await prisma.users.findFirst({
          where: {
            OR: [{ googleId: profile.id }, { email: profile.emails[0].value }],
          },
        });

        if (user) {
          user = await prisma.users.update({
            where: { id: user.id },
            data: {
              googleId: profile.id,
              email: profile.emails[0].value,
              name: profile.displayName,
              picture: profile.photos[0].value,
            },
          });
        } else {
          user = await prisma.users.create({
            data: {
              googleId: profile.id,
              email: profile.emails[0].value,
              name: profile.displayName,
              picture: profile.photos[0].value,
            },
          });
        }

        return done(null, { ...user, accessToken });
      } catch (error) {
        console.error('Error in Google Strategy:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, {
    id: user.id,
    googleId: user.googleId,
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
  });
});

passport.deserializeUser(async (serializedUser, done) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: serializedUser.id } });
    if (user) {
      done(null, {
        ...user,
        googleId: user.googleId,
        accessToken: serializedUser.accessToken,
        refreshToken: user.refreshToken,
      });
    } else {
      done(null, null); // Changed to null instead of error to avoid breaking
    }
  } catch (error) {
    console.error('Deserialize error:', error);
    done(error, null);
  }
});

module.exports = passport;