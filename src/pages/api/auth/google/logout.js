import { corsMiddleware } from '../../../../lib/cors';

const handler = async (req, res) => {
  // Clear the accessToken cookie
  res.setHeader('Set-Cookie', [
    'accessToken=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ]);
  res.status(200).json({ message: 'Logged out' });
};

export default corsMiddleware(handler);