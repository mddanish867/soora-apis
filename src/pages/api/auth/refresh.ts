import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { refresh_token } = req.cookies;

    if (!refresh_token) {
      return res.status(401).json({ message: "Refresh token is required." });
    }

    // Verify the refresh token
    const decoded = jwt.verify(
      refresh_token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: string; email: string };

    if (!decoded) {
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    // Generate a new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Set new access token in the cookie
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

    return res.status(200).json({ accessToken });
  } catch (err) {
    // Check if the error is an instance of Error
    if (err instanceof Error) {
      console.error("Error:", err.message); // Access error message
      return res.status(500).json({ message: err.message });
    } else {
      console.error("Unknown error:", err); // Handle unknown error type
      return res.status(500).json({ message: "An unknown error occurred." });
    }
  }
}
