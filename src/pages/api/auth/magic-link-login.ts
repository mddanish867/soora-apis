import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendMagicLink } from "../../../helper/sendMagicLink";
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
    // Generate a unique magic link token
    const magicLink = crypto.randomBytes(32).toString("hex");
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1); // Magic link expires in 1 hour

    const baseUrl = process.env.BASE_URL || "http://localhost:3000"; // Use actual base URL in production
    const magicLinkUrl = `${baseUrl}/verify-magic-?token=${magicLink}`;

    // Check if the user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update magic link and expiration for the existing user
      await prisma.users.update({
        where: { email },
        data: {
          magicLink,
          magicLinkExpiresAt: expiryDate,
          isMagicLinkUsed: false,
        },
      });
    } else {
      // Create a new user with magic link
      await prisma.users.create({
        data: {
          email,
          magicLink,
          magicLinkExpiresAt: expiryDate,
          isMagicLinkUsed: false,
          isVerified: false,
        },
      });
    }

    // Send OTP to the user's email using Resend API
    const emailSent = await sendMagicLink({
      to: email,
      magicLink: magicLinkUrl,
    });

    if (emailSent) {
      logger.info(`Magic link sent to ${email}: ${magicLink}`);
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Magic link has been sent to your email.",
      });
    } else {
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Failed to send the email. Please try again later.",
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
