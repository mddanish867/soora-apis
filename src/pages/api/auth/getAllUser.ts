import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method not allowed." });
  }

  try {
    const user = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        mobile: true,
        name: true,
        picture: true,
        lastLogin: true,
        isVerified: true,
        isMagicLinkUsed: true,
        is2FAEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Details retrieved sucessfully.",
      });
    }

    return res.status(200).json({
      success: true,
      status: 200,
      data: user,
    });
  } catch (err) {
    logger.error("Error fetching user details:", err);

    if (err instanceof Error) {
      return res
        .status(500)
        .json({ success: false, status: 500, message: err.message });
    }

    return res.status(500).json({
      success: false,
      status: 500,
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);
