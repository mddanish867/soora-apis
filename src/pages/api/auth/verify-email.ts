import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import logger from "../../../lib/logger";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      status: 405, 
      message: "Method not allowed" 
    });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ 
      status: 400, 
      message: "Email and OTP are required." 
    });
  }

  try {
    // Verify JWT secrets are configured
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT configuration missing");
    }

    // Fetch user by email
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ 
        status: 404, 
        message: "User not found." 
      });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(400).json({ 
        status: 400, 
        message: "Invalid OTP." 
      });
    }

    // Check OTP expiration
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({
        status: 400,
        message: "OTP has expired. Please request a new one.",
      });
    }
 

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Update user: verify and clear OTP
    await prisma.users.update({
      where: { email },
      data: {
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    res.setHeader(
      "Set-Cookie",
      [
        cookie.serialize("access_token", accessToken, {
          ...cookieOptions,
          maxAge: 60 * 60, // 1 hour
        }),
        cookie.serialize("refresh_token", refreshToken, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      ]
    );

    return res.status(200).json({
      status: 200,
      message: "User verified successfully.",
      user: {
        id: user.id,
        email: user.email,
        isVerified: true
      }
    });

  } catch (err) {
    logger.error("Verification Error:", err);
    
    if (err instanceof Error) {
      return res.status(500).json({ 
        status: 500, 
        message: err.message 
      });
    }
    
    return res.status(500).json({ 
      status: 500, 
      message: "An unexpected error occurred." 
    });
  } finally {
    await prisma.$disconnect();
  }
}