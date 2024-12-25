// lib/cors.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';

const cors = Cors({
  methods: ['POST', 'GET', 'HEAD', 'OPTIONS'],
  credentials: true,
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://localhost:3000']
    : ['https://soora-sigma.vercel.app/'],
  optionsSuccessStatus: 200
});

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

// API route wrapper
function corsMiddleware(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await runMiddleware(req, res, cors);
      return handler(req, res);
    } catch (error) {
      return res.status(500).json({ error: 'CORS error occurred' });
    }
  };
}

export { corsMiddleware };