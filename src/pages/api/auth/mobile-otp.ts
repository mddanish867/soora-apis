import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";
import { sendOtpSMS } from "../../../helper/sendOtpSMS";
import logger from "../../../lib/logger";

const prisma = new PrismaClient();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_ATTEMPTS = 3; // Maximum attempts per window

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      status: 405,
      message: "Method not allowed."
    });
  }

  const { mobile } = req.body;

  // Enhanced mobile number validation
  if (!mobile) {
    return res.status(400).json({
      status: 400,
      message: "Mobile number is required."
    });
  }

  // Format mobile number to E.164 format
  const formattedMobile = mobile.startsWith('+') ? mobile : `+${mobile}`;
  
  // Validate mobile number format using regex
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(formattedMobile)) {
    return res.status(400).json({
      status: 400,
      message: "Invalid mobile number format. Please use E.164 format (e.g., +1234567890)"
    });
  }

  try {
    // Check rate limiting
    const recentAttempts = await prisma.users.findUnique({
      where: { mobile: formattedMobile },
      select: {
        otpAttempts: true,
        lastOtpRequestTime: true
      }
    });

    const now = new Date();
    if (recentAttempts?.lastOtpRequestTime) {
      const timeSinceLastRequest = now.getTime() - recentAttempts.lastOtpRequestTime.getTime();
      
      if (timeSinceLastRequest < RATE_LIMIT_WINDOW && 
          (recentAttempts.otpAttempts || 0) >= MAX_ATTEMPTS) {
        return res.status(429).json({
          status: 429,
          message: "Too many OTP requests. Please try again later.",
          retryAfter: Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastRequest) / 1000 / 60) // minutes
        });
      }
    }

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    // Set OTP expiry time (1 hour from now)
    const otpExpiresAt = new Date();
    otpExpiresAt.setHours(otpExpiresAt.getHours() + 1);

    const userData = {
      mobile: formattedMobile,
      username: '',
      password: '',
      otp,
      otpExpiresAt,
      isVerified: false,
      otpAttempts: 1,
      lastOtpRequestTime: now
    };

    // Check if user exists or create a new user
    const existingUser = await prisma.users.findUnique({
      where: { mobile: formattedMobile }
    });

    if (existingUser) {
      // Update existing user with new OTP
      await prisma.users.update({
        where: { mobile: formattedMobile },
        data: {
          otp,
          otpExpiresAt,
          otpAttempts: {
            increment: 1
          },
          lastOtpRequestTime: now
        }
      });
    } else {
      // Create a new user with mobile and OTP details
      await prisma.users.create({
        data: userData
      });
    }

    // Send OTP via SMS
    const smsSent = await sendOtpSMS({ to: formattedMobile, otp });

    if (!smsSent) {
      // Rollback user creation if SMS failed
      if (!existingUser) {
        await prisma.users.delete({
          where: { mobile: formattedMobile }
        });
      }

      logger.error("SMS sending failed", { mobile: formattedMobile });
      return res.status(500).json({
        status: 500,
        message: "Failed to send OTP via SMS. Please try again."
      });
    }

    // Log successful OTP send
    logger.info("OTP sent successfully", { mobile: formattedMobile });

    return res.status(200).json({
      status: 200,
      message: `OTP sent successfully to ${formattedMobile}`
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
    logger.error("Verification Error:", { error: errorMessage, mobile: formattedMobile });
    
    return res.status(500).json({
      status: 500,
      message: "An error occurred while sending OTP."
    });
  } finally {
    await prisma.$disconnect();
  }
}