import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import { randomInt } from "crypto"; // We'll use this for generating a numeric OTP
import { sendOtpEmail } from "../../../helper/sendEmail"; // Importing the helper function

const prisma = new PrismaClient();
const saltRounds = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, password, username } = req.body;

  // Validate input fields
  if (!email || !password || !username) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user already exists by email
    const userExists = await prisma.users.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate 6-digit numeric OTP for email verification
    const otp = randomInt(100000, 999999).toString(); // Ensures OTP is 6 digits

    // Create user record in the database with isVerified as false, OTP and no expiration
    await prisma.users.create({
      data: {
        email,
        username,
        password: hashedPassword,
        otp,
        isVerified: false,
      },
    });

    // Send OTP to the user's email using Resend API
    const emailSent = await sendOtpEmail(email, otp);

    if (emailSent) {
      // Simulate sending OTP (for now, just log the OTP)
      logger.info(`OTP for verification sent to ${email}: ${otp}`);
      return res.status(201).json({
        message: "User registered successfully. Please verify your email.",
      });
    } else {
      return res.status(500).json({ message: "Failed to send email with OTP." });
    }
  } catch (err) {
    // Check if the error is an instance of Error
    if (err instanceof Error) {
      console.error("Error:", err.message); // Access error message
      return res.status(500).json({ message: err.message });
    } else {
      console.error("Unknown error:", err); // Handle unknown error type
      return res.status(500).json({ message: "An unknown error occurred." });
    }
  } finally {
    await prisma.$disconnect();  
  }
}
