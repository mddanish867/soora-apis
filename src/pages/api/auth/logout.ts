import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    // Clear the access token and refresh token cookies
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: -1, // Expired cookie
      })
    );

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: -1, // Expired cookie
      })
    );

    return res.status(200).json({ message: "Logged out successfully" });
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
