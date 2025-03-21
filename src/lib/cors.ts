import type { NextApiRequest, NextApiResponse } from "next";

export function corsMiddleware(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://taskflow-three-mu.vercel.app",      
      'http://localhost:3000',     // Local backend
      'https://soora-conversion.vercel.app', // Production frontend
      'https://soora-sigma.vercel.app' // Production frontend
    ];
    const origin = req.headers.origin || ""; // Default to an empty string if undefined

    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin); // Set to the specific origin
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");

      // Preflight request
      if (req.method === "OPTIONS") {
        return res.status(204).end();
      }
    } else {
      res.setHeader("Access-Control-Allow-Origin", "null");
    }

    return handler(req, res);
  };
}
