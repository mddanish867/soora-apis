import { corsMiddleware } from '../../../../lib/cors';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

// Improved cookie extraction function
const extractCookieValue = (cookies, name) => {
  if (!cookies) return null;
  const match = cookies.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const handler = async (req, res) => {
  try {
    // Extract accessToken from cookies with improved method
    const accessToken = extractCookieValue(req.headers.cookie, 'accessToken');  
    
    if (!accessToken) {
      return res.status(401).json({ message: 'No access token provided' });
    }
    
    // Verify the token with Google
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    
    const tokenInfo = await tokenInfoResponse.json();
    if (!tokenInfoResponse.ok || tokenInfo.error) {
      console.error('Token validation failed:', tokenInfo);
      return res.status(401).json({
        message: 'Invalid or expired access token',
        error: tokenInfo.error_description || tokenInfo.error || 'Token validation failed',
      });
    }
    
    // Extract googleId (sub) from token details
    const googleId = tokenInfo.sub;    
    if (!googleId) {
      console.error('No subject ID in token info:', tokenInfo);
      return res.status(401).json({ message: 'Invalid token: missing user identifier' });
    }
    
    // Fetch user by googleId
    const user = await prisma.users.findUnique({
      where: { googleId },
    });

    if (user) {
      return res.status(200).json({
        id: user.id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        accessToken,
      });
    } else {
      return res.status(401).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error in authentication process:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Ensure Prisma connection is properly handled
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);