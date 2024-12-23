import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const saltRounds = 10;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method not allowed." });
  }

  const { email, password } = req.body;

  // Validate input fields
  if (!email) {
    return res
      .status(400)
      .json({ success: false, status: 400, message: "Email is required." });
  }
  if (!password) {
    return res
      .status(400)
      .json({ success: false, status: 400, message: "Password is required." });
  }

  try {
    // Check if the 2FA is disabled
    const isUserExists = await prisma.users.findUnique({
      where: { email },
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    if (isUserExists) {
      // Update magic link and expiration for the existing user
      await prisma.users.update({
        where: { email },
        data: {
          password: hashedPassword,
        },
      });
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Password as been reset successfully.",
      });
    } else {
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Password reset failed.",
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

    return res
      .status(500)
      .json({
        success: false,
        status: 500,
        message: "An unexpected error occurred.",
      });
  } finally {
    await prisma.$disconnect();
  }
}
