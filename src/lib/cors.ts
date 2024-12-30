import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";

const allowedOrigins = ["http://localhost:5173", "http://localhost:3000", "https://taskflow-three-mu.vercel.app"];
  // process.env.NODE_ENV === "development"
  //   ? ["http://localhost:5173", "http://localhost:3000"]
  //   : ["https://soora-sigma.vercel.app"];

const cors = Cors({
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin); // Dynamically set the origin
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
});

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export function corsMiddleware(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await runMiddleware(req, res, cors);
      if (req.method === "OPTIONS") return res.status(200).end();
      return handler(req, res);
    } catch (error) {
      console.error("CORS Error:", error);
      return res.status(500).json({ error: "CORS error occurred" });
    }
  };
}
