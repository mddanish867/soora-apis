import { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { corsMiddleware } from "../../../lib/cors";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: -1,
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        status: 405,
        message: "Method not allowed"
      });
    }

    // Get the current access token to identify the session
    const access_token = req.cookies.access_token;

    if (access_token) {
      try {
        // Decode the token to get userId
        const decoded = jwt.verify(access_token, process.env.JWT_SECRET!) as { userId: string };
        
        // Update the current session to inactive
        await prisma.userSession.updateMany({
          where: {
            userId: decoded.userId,
            isActive: true,
            // You might want to add additional criteria to identify the specific session
            // For example, if you store the device info or session token
          },
          data: {
            isActive: false
          }
        });
      } catch (error) {
        // If token is invalid, we still want to proceed with logout
        console.error("Error updating session:", error);
      }
    }

    // Clear cookies regardless of session update success
    res.setHeader("Set-Cookie", [
      serialize("access_token", "", cookieOptions),
      serialize("refresh_token", "", cookieOptions)
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Logged out successfully"
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      success: false,
      status: 500,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default corsMiddleware(handler);