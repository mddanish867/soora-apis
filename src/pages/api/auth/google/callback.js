// callback.js - Optimized for Vercel deployment
import { corsMiddleware } from "../../../../lib/cors";
const passport = require("../../../../lib/passport");
const passportMiddleware = require("../../../../lib/passportMiddleware");

// Add a timeout promise for debugging
const timeoutPromise = (ms) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
);

// Main handler with timeout protection
const handler = async (req, res) => {
  console.log('Google callback initiated on', 
    process.env.NODE_ENV === 'production' ? 'production' : 'development');
  
  try {
    // For debugging, set a 8-second timeout (Vercel has a 10s limit)
    const result = await Promise.race([
      handleAuth(req, res),
      timeoutPromise(8000)
    ]);
    
    return result;
  } catch (error) {
    console.error('Callback error with timeout check:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Authentication process failed or timed out', 
        error: error.message 
      });
    }
  }
};

// The actual authentication handling logic
async function handleAuth(req, res) {
  try {
    // Apply passport middleware
    await new Promise((resolve, reject) => {
      passportMiddleware(req, res, (err) => {
        if (err) {
          console.error('Passport middleware error:', err);
          reject(err);
          return;
        }
        resolve();
      });
    });

    console.log('Passport middleware applied, method:', req.method);
    
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }
    
    // Handle Google authentication
    await new Promise((resolve, reject) => {
      passport.authenticate("google", { 
        failureRedirect: "/"
      })(req, res, (err) => {
        if (err) {
          console.error('Authentication error:', err);
          reject(err);
          return;
        }
        
        console.log('User authentication completed:', req.user ? 'success' : 'failed');
        
        if (!req.user) {
          console.log('No user object in request after authentication');
          res.status(401).json({ message: "Authentication failed" });
          reject(new Error("Authentication failed - no user"));
          return;
        }
        
        // User authenticated successfully
        try {
          console.log('Setting cookies and redirecting');
          const cookieOptions = process.env.NODE_ENV === 'production'
            ? 'Path=/; HttpOnly; SameSite=Lax; Secure'
            : 'Path=/; HttpOnly; SameSite=Lax';
          
          res.setHeader("Set-Cookie", [
            `accessToken=${req.user.accessToken}; ${cookieOptions}`,
            `refreshToken=${req.user.refreshToken || ""}; ${cookieOptions}`
          ]);
          
          // Redirect to frontend
          const redirectUrl = `${process.env.FRONTEND_URL}/dashboard`;
          console.log('Redirecting to:', redirectUrl);
          res.redirect(302, redirectUrl);
          resolve();
        } catch (error) {
          console.error('Error setting cookies:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Auth handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Authentication process failed', 
        error: error.message 
      });
    }
  }
}

export default corsMiddleware(handler);