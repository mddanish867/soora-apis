import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { corsMiddleware } from '../../../../lib/cors';

const prisma = new PrismaClient();

// Improved cookie extraction function
const extractCookieValue = (cookies: string | undefined, name: string): string | null => {
  if (!cookies) return null;
  const match = cookies.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  name: string;
  picture?: string;  
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Extract accessToken from cookies with improved method
    const accessToken = extractCookieValue(req.headers.cookie, 'access_token');

    if (!accessToken) {
      return res.status(401).json({ message: 'No access token provided' });
    }

    // Verify the token (using jwt library)
    try {
      const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET!) as JwtPayload;

      // Extract email from token
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ message: 'Invalid token: missing email' });
      }

      // Fetch user by email
      const user = await prisma.users.findUnique({
        where: { email },
      });

      if (user) {
        return res.status(200).json({
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          picture: user.picture || null, // Use profilePicture from DB
        });
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    } catch (error: any) {
      console.error('Token verification failed:', error);
      return res.status(401).json({
        message: 'Invalid or expired access token',
        error: error.message || 'Token verification failed',
      });
    }
  } catch (error: any) {
    console.error('Error in authentication process:', error);
    return res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    // Ensure Prisma connection is properly handled
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);