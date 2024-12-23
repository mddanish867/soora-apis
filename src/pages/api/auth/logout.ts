import { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: -1,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ 
        success: false, 
        status: 405, 
        message: "Method not allowed" 
      });
    }

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
  }
}