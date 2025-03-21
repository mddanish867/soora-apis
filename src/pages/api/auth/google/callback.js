import { corsMiddleware } from "../../../../lib/cors";
const passport = require('../../../../lib/passport');
const passportMiddleware = require('../../../../lib/passportMiddleware');

const handler = async (req, res)=> {
  await new Promise((resolve) => passportMiddleware(req, res, resolve));

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  passport.authenticate('google', { failureRedirect: '/' })(
    req,
    res,
    () => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication failed' });
      }

      // Set cookies for access and refresh tokens
      res.setHeader('Set-Cookie', [
        `accessToken=${req.user.accessToken}; Path=/; HttpOnly; SameSite=Lax`,
        `refreshToken=${req.user.refreshToken || ''}; Path=/; HttpOnly; SameSite=Lax`,
      ]);

      // Redirect to frontend
      // For Node.js/Express backend
const FRONTEND_URL = process.env.FRONTEND_URL;
res.redirect(`${FRONTEND_URL}/dashboard`);
     
    }
  );
}
export default corsMiddleware(handler);