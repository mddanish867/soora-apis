// /pages/api/sessions/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Get token from cookies (or headers) and decode to get userId
  const { access_token } = req.cookies;
  if (!access_token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  //  const access_token = localStorage.getItem('access_token');
  // if (!access_token) {
  //   return res.status(401).json({ message: "Unauthorized" });
  // }


  let decoded: any;
  try {
    decoded = jwt.verify(access_token, process.env.JWT_SECRET!);
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const userId = decoded.userId;

  const sessions = await prisma.userSession.findMany({
    where: {
      userId,
      },
  });

  return res.status(200).json({ sessions });
};

export default corsMiddleware(handler);
