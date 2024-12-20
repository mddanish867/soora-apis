import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if method is POST, return early if not.
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, otp } = req.body;

  // Validate input
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    // Fetch user by email
    const user = await prisma.users.findUnique({
      where: { email },
    });

    // Handle user not found case
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    // Check if the user is already verified
    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified." });
    }

    // Update the user to verified and clear OTP
    await prisma.users.update({
      where: { email },
      data: { isVerified: true, otp: null },
    });

    return res.status(200).json({ message: "User verified successfully." });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
    logger.error("Verification Error:", errorMessage);
    return res.status(500).json({ message: errorMessage });
  } finally {
    // Ensure Prisma disconnects after request handling
    await prisma.$disconnect();
  }
}
