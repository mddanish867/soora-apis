import Cors from "cors";
import type { NextApiRequest, NextApiResponse } from "next";

// Initialize CORS middleware
const cors = Cors({
  origin: (origin, callback) => {
    console.log("Origin received:", origin);
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://soora-sigma.vercel.app",
      "https://taskflow-three-mu.vercel.app",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("Blocked Origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
});

// Run CORS middleware
const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: Function) =>
  new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });

// Wrap your API handler with the CORS middleware
export const corsMiddleware = (handler: Function) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await runMiddleware(req, res, cors);
      if (req.method === "OPTIONS") {
        return res.status(200).end(); // Allow OPTIONS preflight requests
      }
      return handler(req, res);
    } catch (err) {
      return res.status(403).json({ success: false, message: err });
    }
  };
