import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { PrismaClient } from "@prisma/client";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, status: 405, message: "Method not allowed" });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Email and password are required.",
      });
    }

    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res
        .status(404)
        .json({ success: false, status: 404, message: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid email or password.",
      });
    }

    if (user.isVerified === false) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: "Account is not verified.",
      });
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets not configured");
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email || "",
        name: user.username || "",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email || "",
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    res.setHeader("Set-Cookie", [
      serialize("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60,
      }),
      serialize("refresh_token", refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7,
      }),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Logged in successfully",
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
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
};
export default corsMiddleware(handler);
