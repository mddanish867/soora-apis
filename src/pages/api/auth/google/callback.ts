// // callback.js - Optimized for Vercel deployment
// import { corsMiddleware } from "../../../../lib/cors";
// const passport = require("../../../../lib/passport");
// const passportMiddleware = require("../../../../lib/passportMiddleware");

// // Add a timeout promise for debugging
// const timeoutPromise = (ms) => new Promise((_, reject) => 
//   setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
// );

// // Main handler with timeout protection
// const handler = async (req, res) => {
//   console.log('Google callback initiated on', 
//     process.env.NODE_ENV === 'production' ? 'production' : 'development');
  
//   try {
//     // For debugging, set a 8-second timeout (Vercel has a 10s limit)
//     const result = await Promise.race([
//       handleAuth(req, res),
//       timeoutPromise(8000)
//     ]);
    
//     return result;
//   } catch (error) {
//     console.error('Callback error with timeout check:', error);
//     if (!res.headersSent) {
//       res.status(500).json({ 
//         message: 'Authentication process failed or timed out', 
//         error: error.message 
//       });
//     }
//   }
// };

// // The actual authentication handling logic
// async function handleAuth(req, res) {
//   try {
//     // Apply passport middleware
//     await new Promise((resolve, reject) => {
//       passportMiddleware(req, res, (err) => {
//         if (err) {
//           console.error('Passport middleware error:', err);
//           reject(err);
//           return;
//         }
//         resolve();
//       });
//     });

//     console.log('Passport middleware applied, method:', req.method);
    
//     if (req.method !== "GET") {
//       return res.status(405).json({ message: "Method not allowed" });
//     }
    
//     // Handle Google authentication
//     await new Promise((resolve, reject) => {
//       passport.authenticate("google", { 
//         failureRedirect: "/"
//       })(req, res, (err) => {
//         if (err) {
//           console.error('Authentication error:', err);
//           reject(err);
//           return;
//         }
        
//         console.log('User authentication completed:', req.user ? 'success' : 'failed');
        
//         if (!req.user) {
//           console.log('No user object in request after authentication');
//           res.status(401).json({ message: "Authentication failed" });
//           reject(new Error("Authentication failed - no user"));
//           return;
//         }
        
//         // User authenticated successfully
//         try {
//           console.log('Setting cookies and redirecting');
//           const cookieOptions = process.env.NODE_ENV === 'production'
//             ? 'Path=/; HttpOnly; SameSite=Lax; Secure'
//             : 'Path=/; HttpOnly; SameSite=Lax';
          
//           res.setHeader("Set-Cookie", [
//             `accessToken=${req.user.accessToken}; ${cookieOptions}`,
//             `refreshToken=${req.user.refreshToken || ""}; ${cookieOptions}`
//           ]);
          
//           // Redirect to frontend
//           const redirectUrl = `${process.env.FRONTEND_URL}/dashboard`;
//           console.log('Redirecting to:', redirectUrl);
//           res.redirect(302, redirectUrl);
//           resolve();
//         } catch (error) {
//           console.error('Error setting cookies:', error);
//           reject(error);
//         }
//       });
//     });
//   } catch (error) {
//     console.error('Auth handler error:', error);
//     if (!res.headersSent) {
//       res.status(500).json({ 
//         message: 'Authentication process failed', 
//         error: error.message 
//       });
//     }
//   }
// }

// export default corsMiddleware(handler);
// pages/api/auth/google/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { corsMiddleware } from '../../../../lib/cors';
import { getLocationFromIP } from '../../../../services/locationService';
import { UAParser } from 'ua-parser-js';

const prisma = new PrismaClient();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.VITE_GOOGLE_REDIRECT_URI
);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== 'GET') {
      return res
        .status(405)
        .json({ success: false, status: 405, message: 'Method not allowed' });
    }

    const { code } = req.query;
    console.log('Received code:', code);

    if (!code || typeof code !== 'string') {
      return res
        .status(400)
        .json({ success: false, status: 400, message: 'Code is required.' });
    }

    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: process.env.VITE_GOOGLE_REDIRECT_URI, // Explicitly set redirect_uri
    });

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const { email, name, picture } = userInfo.data;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, status: 400, message: 'Email not found.' });
    }

    let user = await prisma.users.findUnique({
      where: { email: email as string },
    });

    if (!user) {
      user = await prisma.users.create({
        data: {
          email: email as string,
          name: name as string,
          username: email.split('@')[0],
          isVerified: true,
          picture: picture || null,
        },
      });
    } else {
      await prisma.users.update({
        where: { id: user.id },
        data: {
          picture: picture || null,
        },
      });
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email || '',
        username: user.username || '',
        name: user.name || '',
        picture: picture || '',
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email || '',
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.setHeader('Set-Cookie', [
      serialize('access_token', accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60,
      }),
      serialize('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7,
      }),
    ]);

    // --- Capture Session Information ---
    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser(uaString);
    const uaResult = parser.getResult();
    const device = uaResult.device.model || uaResult.os.name || 'Unknown';
    const os = uaResult.os.name || 'Unknown';
    const browser = uaResult.browser.name || 'Unknown';

    const getClientIp = (req: NextApiRequest): string | undefined => {
      const xForwardedFor = req.headers['x-forwarded-for'];

      let ipAddress;

      if (typeof xForwardedFor === 'string') {
        ipAddress = xForwardedFor.split(',')[0].trim();
      } else if (Array.isArray(xForwardedFor)) {
        ipAddress = xForwardedFor[0].split(',')[0].trim();
      } else {
        ipAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
      }

      if (ipAddress === '::1') {
        ipAddress = '127.0.0.1';
      }

      return ipAddress;
    };

    const ipAddress = getClientIp(req);

    let location = '';
    if (ipAddress) {
      location = await getLocationFromIP(ipAddress);
    } else {
      console.error('IP Address is undefined');
    }

    await prisma.userSession.create({
      data: {
        userId: user.id,
        device,
        os,
        browser,
        location,
      },
    });
    // --- End Capture ---

    // Redirect to your React app's dashboard or home page
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err: any) {
    console.error('Error:', err);
    return res.status(500).json({
      success: false,
      status: 500,
      message: err.message || 'An unknown error occurred.',
    });
  } finally {
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);