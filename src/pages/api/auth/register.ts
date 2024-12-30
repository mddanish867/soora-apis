import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import { randomInt } from "crypto";
import { sendOtpEmail } from "../../../helper/sendEmail";
import { allowCors } from "@/lib/cors";
const prisma = new PrismaClient();
const saltRounds = 10;


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method not allowed." });
  }

  const { email, password, username } = req.body;

  // Validate input fields
  if (!email || !password || !username) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "All fields are required.",
    });
  }

  try {
    // Check if user already exists by username and isVerified
    const userExists = await prisma.users.findUnique({
      where: { username },
    });

    if (userExists?.isVerified) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Username already exists and is verified.",
      });
    }

    // Check if user already exists by email
    const userExistingEmail = await prisma.users.findUnique({
      where: { email },
    });

    if (userExistingEmail) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Email already exists. Please log in or reset your password.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // OTP Expiry Date
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    // Generate 6-digit numeric OTP for email verification
    const otp = randomInt(100000, 999999).toString();

    // Create user record in the database with isVerified as false, OTP, and expiration
    await prisma.users.create({
      data: {
        email,
        username,
        password: hashedPassword,
        otp,
        otpExpiresAt: expiryDate,
        isVerified: false,
        is2FAEnabled: false,
      },
    });

    // Send OTP to the user's email using Resend API
    const emailSent = await sendOtpEmail({ to: email, otp });

    if (emailSent) {
      logger.info(`OTP for verification sent to ${email}: ${otp}`);
      return res.status(201).json({
        success: true,
        status: 200,
        message: "User registered successfully. Please verify your email.",
      });
    } else {
      // Rollback user creation if OTP email fails
      await prisma.users.delete({ where: { email } });

      return res.status(500).json({
        success: false,
        status: 500,
        message: "Failed to send email with OTP.",
      });
    }
  } catch (err) {
    // Centralized error handling
    logger.error("Error during user registration:", err);

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
export default allowCors(handler);
