import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, status: 405, message: "Method not allowed." });
    }

    const { token } = req.body;

    // Validate the token field
    if (!token) {
      return res
        .status(400)
        .json({ success: false, status: 400, message: "Token is required." });
    }

    // Check if token exists and is valid
    const user = await prisma.users.findFirst({
      where: {
        magicLink: token,
        magicLinkExpiresAt: {
          gte: new Date(), // Ensure token hasn't expired
        },
        isMagicLinkUsed: false,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid or expired magic link.",
      });
    }

    // Verify JWT secrets are configured
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets not configured.");
    }

    // Generate JWT access token (expires in 1 hour)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Generate JWT refresh token (expires in 7 days)
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Mark the magic link as used
    await prisma.users.update({
      where: { id: user.id },
      data: { isMagicLinkUsed: true },
    });

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    // Set access token and refresh token cookies
    res.setHeader("Set-Cookie", [
      cookie.serialize("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60, // 1 hour
      }),
      cookie.serialize("refresh_token", refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Logged in successfully via magic link.",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      success: false,
      status: 500,
      message:
        err instanceof Error ? err.message : "An unknown error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
}
