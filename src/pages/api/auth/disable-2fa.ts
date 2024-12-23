import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method not allowed." });
  }

  const { email } = req.body;

  // Validate input fields
  if (!email) {
    return res
      .status(400)
      .json({ success: false, status: 400, message: "Email is required." });
  }

  try {
    // Check if the 2FA is already enabled
    const is2FAEnabled = await prisma.users.findUnique({
      where: { email, is2FAEnabled: true },
    });

    if (is2FAEnabled) {
      await prisma.users.update({
        where: { email },
        data: {
          is2FAEnabled: false,
        },
      });
      return res.status(200).json({
        success: true,
        status: 200,
        message: "2FA has been successfully disabled for your account.",
      });
    } else {
      return res.status(500).json({
        success: false,
        status: 500,
        message: "2FA already disabled for your account.",
      });
    }
  } catch (err) {
    // Centralized error handling
    logger.error("Error during sending magic link:", err);

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
}
