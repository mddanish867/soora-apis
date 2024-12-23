import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import logger from "../../../lib/logger";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      status: 405,
      message: "Method not allowed",
    });
  }

  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Mobile number and OTP are required.",
    });
  }

  try {
    // Verify JWT secret
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT configuration missing");
    }

    const user = await prisma.users.findUnique({
      where: { mobile },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found.",
      });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid OTP.",
      });
    }

    // Check OTP expiration
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { userId: user.id, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, mobile: user.mobile },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Update user record
    await prisma.users.update({
      where: { mobile },
      data: {
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    // Set cookies for session
    res.setHeader("Set-Cookie", [
      serialize("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      }),
      serialize("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      }),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      message: "User verified successfully.",
      user: {
        id: user.id,
        mobile: user.mobile,
        isVerified: true,
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    logger.error("Verification Error:", errorMessage);
    return res
      .status(500)
      .json({ success: false, status: 500, message: errorMessage });
  } finally {
    await prisma.$disconnect();
  }
}
