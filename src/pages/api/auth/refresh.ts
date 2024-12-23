import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

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

  const { refresh_token } = req.cookies;

  if (!refresh_token) {
    return res.status(401).json({
      success: false,
      status: 401,
      message: "Refresh token is required.",
    });
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets not configured");
  }

  try {
    const decoded = jwt.verify(
      refresh_token,
      process.env.JWT_REFRESH_SECRET
    ) as JWTPayload;

    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        ...(decoded.name && { name: decoded.name }),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.setHeader(
      "Set-Cookie",
      serialize("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60,
      })
    );

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.setHeader("Set-Cookie", [
        serialize("access_token", "", { ...cookieOptions, maxAge: 0 }),
        serialize("refresh_token", "", { ...cookieOptions, maxAge: 0 }),
      ]);

      return res.status(401).json({
        success: false,
        status: 401,
        message: "Refresh token has expired.",
      });
    }

    return res.status(401).json({
      success: false,
      status: 401,
      message: "Invalid refresh token.",
    });
  }
}