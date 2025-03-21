// import type { NextApiRequest, NextApiResponse } from "next";

// export function corsMiddleware(handler: Function) {
//   return async (req: NextApiRequest, res: NextApiResponse) => {
//     const allowedOrigins = [
//       "http://localhost:5173",
//       "https://taskflow-three-mu.vercel.app",      
//       'http://localhost:3000',     // Local backend
//       'https://soora-conversion.vercel.app', // Production frontend
//       'https://soora-sigma.vercel.app' // Production frontend
//     ];
//     const origin = req.headers.origin || ""; // Default to an empty string if undefined

//     if (allowedOrigins.includes(origin)) {
//       res.setHeader("Access-Control-Allow-Origin", origin); // Set to the specific origin
//       res.setHeader(
//         "Access-Control-Allow-Methods",
//         "GET, POST, PUT, DELETE, OPTIONS"
//       );
//       res.setHeader(
//         "Access-Control-Allow-Headers",
//         "Content-Type, Authorization"
//       );
//       res.setHeader("Access-Control-Allow-Credentials", "true");

//       // Preflight request
//       if (req.method === "OPTIONS") {
//         return res.status(204).end();
//       }
//     } else {
//       res.setHeader("Access-Control-Allow-Origin", "null");
//     }

//     return handler(req, res);
//   };
// }

// lib/cors.js
import Cors from 'cors';
import type { NextApiRequest, NextApiResponse } from "next";

// Initialize the CORS middleware with proper configuration
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // Important for cookies and authentication
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    const allowedOrigins = [
      'http://localhost:5173',     // Local frontend
      'http://localhost:3000',     // Local backend
      'https://soora-conversion.vercel.app', // Production frontend
      'https://soora-sigma.vercel.app'       // Production backend
    ];
    
    // Check if the origin is allowed
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Origin not allowed by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  }
});

// Helper method to initialize the middleware
export function corsMiddleware(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Run cors middleware
    await new Promise((resolve, reject) => {
      cors(req, res, (result) => {
        if (result instanceof Error) {
          console.error('CORS error:', result);
          return reject(result);
        }
        return resolve(result);
      });
    });

    // Set necessary headers for cross-domain cookies
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Run the actual handler
    return handler(req, res);
  };
}