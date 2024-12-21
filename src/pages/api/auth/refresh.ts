import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";

interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ 
        status: 405, 
        message: "Method not allowed" 
      });
    }

    const { refresh_token } = req.cookies;

    if (!refresh_token) {
      return res.status(401).json({ 
        status: 401, 
        message: "Refresh token is required." 
      });
    }

    // Verify JWT secrets are configured
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets not configured");
    }

    try {
      // Verify the refresh token
      const decoded = jwt.verify(
        refresh_token,
        process.env.JWT_REFRESH_SECRET
      ) as JWTPayload;

      // Generate a new access token
      const accessToken = jwt.sign(
        { 
          userId: decoded.userId, 
          email: decoded.email,
          ...(decoded.name && { name: decoded.name })
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Set new access token in the cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60, // 1 hour
      };

      res.setHeader(
        "Set-Cookie",
        cookie.serialize("access_token", accessToken, cookieOptions)
      );

      return res.status(200).json({ 
        status: 200,
        message: "Access token refreshed successfully",
      });
    } catch (jwtError) {
      // Handle specific JWT verification errors
      if (jwtError instanceof jwt.TokenExpiredError) {
        // Clear both tokens if refresh token is expired
        res.setHeader(
          "Set-Cookie",
          [
            cookie.serialize("access_token", "", {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax" as const,
              path: "/",
              maxAge: 0,
            }),
            cookie.serialize("refresh_token", "", {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax" as const,
              path: "/",
              maxAge: 0,
            })
          ]
        );
        
        return res.status(401).json({ 
          status: 401, 
          message: "Refresh token has expired." 
        });
      }
      
      return res.status(401).json({ 
        status: 401, 
        message: "Invalid refresh token." 
      });
    }
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      status: 500,
      message: err instanceof Error ? err.message : "An unknown error occurred.",
    });
  }
}