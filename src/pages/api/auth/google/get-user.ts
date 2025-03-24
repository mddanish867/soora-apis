import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { corsMiddleware } from '../../../../lib/cors';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  username?: string;
  name?: string;
  picture?: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== 'POST') { // POST kar rahe hain kyunki refresh_token body mein bhejenge
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Extract refreshToken from request body
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    // Verify the refresh token
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    try {
      const decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as JwtPayload;

      // Extract email from token
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ message: 'Invalid refresh token: missing email' });
      }

      // Fetch user by email
      const user = await prisma.users.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate a new access token
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }

      const newAccessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          picture: user.picture || '',
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Return user data with new access token
      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken, // Same refresh token wapas bhejo
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          picture: user.picture || null,
        },
      });
    } catch (error: any) {
      console.error('Refresh token verification failed:', error);
      return res.status(401).json({
        message: 'Invalid or expired refresh token',
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
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);