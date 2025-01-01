import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Validate HTTP method
  if (req.method !== "POST") {
    return res.status(405).json({ status: 405, message: "Method not allowed" });
  }

  const { email, otp } = req.body;

  // Validate input fields
  if (!email || !otp) {
    return res
      .status(400)
      .json({ status: 400, message: "Email and OTP are required." });
  }

  try {
    // Fetch user by email
    const user = await prisma.users.findUnique({
      where: { email },
    });

    // Handle case when user not found
    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found." });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(400).json({ status: 400, message: "Invalid OTP." });
    }

    // Check if the user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        status: 400,
        message: "User already verified.",
      });
    }

    // Update the user's status to verified and clear OTP
    await prisma.users.update({
      where: { email },
      data: {
        isVerified: true,
        otp: null,
      },
    });

    return res.status(200).json({
      status: 200,
      message: "User verified successfully.",
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    logger.error("Verification Error:", errorMessage);
    return res.status(500).json({ status: 500, message: errorMessage });
  } finally {
    // Ensure database connection is closed
    await prisma.$disconnect();
  }
};
export default corsMiddleware(handler);
