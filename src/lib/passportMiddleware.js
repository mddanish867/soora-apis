const session = require('express-session');
const passport = require('./passport');

module.exports = (req, res, next) => {
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-secret-fallback',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // False in dev
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  sessionMiddleware(req, res, () => {
    passport.initialize()(req, res, () => {
      passport.session()(req, res, () => {
        next();
      });
    });
  });
};