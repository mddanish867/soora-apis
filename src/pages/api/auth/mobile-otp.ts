import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";
import { sendOtpSMS } from "../../../helper/sendOtpSMS"; // Import sendOtpSMS helper function
import logger from "../../../lib/logger";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      status: 405, 
      message: "Method not allowed." 
    });
  }

  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      status: 400,
      message: "Mobile number is required."
    });
  }

  try {
    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    // Set OTP expiry time (1 hour from now)
    const otpExpiresAt = new Date();
    otpExpiresAt.setHours(otpExpiresAt.getHours() + 1);

    const userData = {
      mobile,
      username: '',     // Optional field set to null
      password: '',     // Optional field set to null
      otp,
      otpExpiresAt,
      isVerified: false,
    };

    // Check if user exists or create a new usery
    const existingUser = await prisma.users.findUnique({
      where: { mobile }
    });

    if (existingUser) {
      // Update existing user with new OTP
      await prisma.users.update({
        where: { mobile },
        data: {
          otp,
          otpExpiresAt,
        }
      });
    } else {
      // Create a new user with mobile and OTP details
      await prisma.users.create({
        data: userData
      });
    }

    // Send OTP via SMS
    const smsSent = await sendOtpSMS({to:mobile, otp});

    if (!smsSent) {
      if (!existingUser) {
        await prisma.users.delete({
          where: { mobile }
        });
      }
      
      return res.status(500).json({
        status: 500,
        message: "Failed to send OTP via SMS. Please try again."
      });
    }

    return res.status(200).json({
      status: 200,
      message: `OTP sent successfully to ${mobile}`
    });

  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    logger.error("Verification Error:", errorMessage);
    return res.status(500).json({
      status: 500,
      message: "An error occurred while sending OTP."
    });
  } finally {
    await prisma.$disconnect();
  }
}
