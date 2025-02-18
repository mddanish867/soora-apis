// /pages/api/sessions/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  const { access_token } = req.cookies;
  if (!access_token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(access_token, process.env.JWT_SECRET!);
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const userId = decoded.userId;

  // Find the session and ensure it belongs to the current user
  const session = await prisma.userSession.findFirst({
    where: {
      id: id as string,
      userId,
      isActive: true,
    },
  });

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  // Revoke the session by marking it as inactive
  await prisma.userSession.update({
    where: { id: session.id },
    data: { isActive: false },
  });

  return res.status(200).json({ message: "Session revoked successfully" });
};

export default corsMiddleware(handler);
