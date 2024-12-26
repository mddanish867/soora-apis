import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import type { CorsOptions } from 'cors';

// Define allowed origins
const allowedOrigins = [
  'http://localhost:5173',          // Local development
  'http://localhost:3000',          // Local development alternative
  'https://taskflow-three-mu.vercel.app/',  // Replace with your production frontend URL
  'https://soora-sigma.vercel.app'  // Your Vercel deployment URL
];

// Initialize the cors middleware with dynamic origin checking
const corsOptions: CorsOptions = {
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
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

const cors = Cors(corsOptions);

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
): Promise<any> {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export function corsMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await runMiddleware(req, res, cors);
      
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      return handler(req, res);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed by CORS'
      });
    }
  };
}