import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import bcrypt from "bcryptjs";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();
const saltRounds = 10;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method not allowed." });
  }

  const { email, currentPassword, newPassword } = req.body;

  // Validate input fields
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Email, current password, and new password are required.",
    });
  }

  try {
    // Find the user
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found or password not set.",
      });
    }

    // Verify current password - now type-safe since we checked for null
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: "Current password is incorrect.",
      });
    }

    // Hash the new password
    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password for the existing user
    await prisma.users.update({
      where: { email },
      data: {
        password: newHashedPassword,
      },
    });

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Password has been updated successfully.",
    });

  } catch (err) {
    // Centralized error handling
    logger.error("Error during password update:", err);

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