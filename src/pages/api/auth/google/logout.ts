import { NextApiRequest, NextApiResponse } from 'next';
import { corsMiddleware } from '../../../../lib/cors';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Clear the access_token and refresh_token cookies
    res.setHeader('Set-Cookie', [
      'access_token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'refresh_token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ]);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
};

export default corsMiddleware(handler);