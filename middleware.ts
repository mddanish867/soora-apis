// lib/cors.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';

// Initialize the cors middleware
const cors = Cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Your frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Content-Type',
    'Date',
    'X-Api-Version',
    'Authorization',
  ],
});

// Helper method to wait for a middleware to execute before continuing
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Updated CORS middleware
export function corsMiddleware(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Run the CORS middleware
    await runMiddleware(req, res, cors);

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Call the actual handler
    return handler(req, res);
  };
}