import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";
import logger from "../../../lib/logger";
import { randomInt } from "crypto";
import { sendOtpEmail } from "../../../helper/sendEmail";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      status: 405,
      message: "Method not allowed.",
    });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Email is required.",
    });
  }

  try {
    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    // Set OTP expiry (1 hour from now)
    const otpExpiresAt = new Date();
    otpExpiresAt.setHours(otpExpiresAt.getHours() + 1);

    // Define user data with all fields from schema
    const userData: Prisma.UsersCreateInput = {
      email,
      username: "", // Optional field set to null
      password: "", // Optional field set to null
      otp,
      otpExpiresAt,
      isVerified: false,
    };

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user's OTP
      await prisma.users.update({
        where: { email },
        data: {
          otp,
          otpExpiresAt,
        },
      });
    } else {
      // Create new user with schema-compliant data
      await prisma.users.create({
        data: userData,
      });
    }

    // Send OTP email
    const emailSent = await sendOtpEmail({ to: email, otp });

    if (!emailSent) {
      // If email fails and this was a new user, delete them
      if (!existingUser) {
        await prisma.users.delete({
          where: { email },
        });
      }

      return res.status(500).json({
        success: false,
        status: 500,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    logger.info(`OTP sent to ${email}: ${otp}`);

    return res.status(200).json({
      success: true,
      status: 200,
      message: `OTP sent successfully to ${email}`,
    });
  } catch (err) {
    logger.error("Error during OTP generation:", err);

    if (err instanceof Error) {
      // Handle unique constraint violations
      if (err.message.includes("Unique constraint")) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: "Email already registered.",
        });
      }

      return res.status(500).json({
        success: false,
        status: 500,
        message: err.message,
      });
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
