const passport = require('../../../lib/passport');
const passportMiddleware = require('../../../lib/passportMiddleware');
import { corsMiddleware } from "../../../lib/cors";

const handler = async (req, res) =>{
  await new Promise((resolve) => passportMiddleware(req, res, resolve));
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })(req, res);
}
export default corsMiddleware(handler);