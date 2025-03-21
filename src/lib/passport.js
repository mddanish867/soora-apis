// passport.js - With environment-aware configuration
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Determine the callback URL based on environment
const getCallbackURL = () => {
  // Use the environment variable if set
  if (process.env.CALL_BACK_URL) {
    return process.env.CALL_BACK_URL;
  }
  
  // Fallback logic based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction 
    ? 'https://soora-sigma.vercel.app/api/auth/google/callback'
    : 'http://localhost:3000/api/auth/google/callback';
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: getCallbackURL(),
      // Add proxy: true to handle secure cookies in proxy environments like Vercel
      proxy: process.env.NODE_ENV === 'production'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google auth profile received:', profile.id);
        
        let user = await prisma.users.findFirst({
          where: {
            OR: [{ googleId: profile.id }, { email: profile.emails[0].value }],
          },
        });
        
        if (user) {
          console.log('Updating existing user:', user.id);
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
          console.log('Creating new user with Google ID:', profile.id);
          user = await prisma.users.create({
            data: {
              googleId: profile.id,
              email: profile.emails[0].value,
              name: profile.displayName,
              picture: profile.photos[0].value,
            },
          });
        }
        
        console.log('Authentication successful for user:', user.id);
        return done(null, { ...user, accessToken, refreshToken });
      } catch (error) {
        console.error('Error in Google Strategy:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.id);
  done(null, {
    id: user.id,
    googleId: user.googleId,
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
  });
});

passport.deserializeUser(async (serializedUser, done) => {
  try {
    console.log('Deserializing user:', serializedUser.id);
    const user = await prisma.users.findUnique({ where: { id: serializedUser.id } });
    if (user) {
      done(null, {
        ...user,
        googleId: user.googleId,
        accessToken: serializedUser.accessToken,
        refreshToken: serializedUser.refreshToken,
      });
    } else {
      console.log('User not found during deserialization');
      done(null, null);
    }
  } catch (error) {
    console.error('Deserialize error:', error);
    done(error, null);
  }
});

module.exports = passport;