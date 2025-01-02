import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ status: 405, message: "Method not allowed" });
  }

  const { email, otp } = req.body;

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

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found." });
    }

    // Validate OTP and check expiry (assuming user.otpExpiry exists in DB)
    if (user.otp !== otp) {
      return res.status(400).json({ status: 400, message: "Invalid OTP." });
    }

    const currentTime = new Date();
    if (user.otpExpiresAt && currentTime > user.otpExpiresAt) {
      return res
        .status(400)
        .json({
          status: 400,
          message: "OTP has expired. Please request a new one.",
        });
    }

    // Update user status and clear OTP
    await prisma.users.update({
      where: { email },
      data: {
        otp: null,
        otpExpiresAt: null,
      },
    });

    return res.status(200).json({
      status: 200,
      message: "OTP verified successfully.",
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    logger.error("Verification Error:", errorMessage);
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);
