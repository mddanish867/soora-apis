import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Fetch user by email
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ message: "Account is not verified." });
    }

    // Ensure environment variables are set
    console.log("JWT_SECRET: ", process.env.JWT_SECRET); // Check if JWT_SECRET is correct

    // Generate JWT access token (expires in 1 hour)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.username },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Generate JWT refresh token (expires in 7 days)
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "7d" }
    );

    // Log token and check cookie.serialize function usage
    console.log("Setting access and refresh tokens as cookies.");

    // Set access token in HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      })
    );

    // Set refresh token in HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    );

    return res.status(200).json({
      message: "Logged in successfully",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error:", err.message);
      return res.status(500).json({ message: err.message });
    } else {
      console.error("Unknown error:", err);
      return res.status(500).json({ message: "An unknown error occurred." });
    }
  }
}
