import { NextApiRequest, NextApiResponse } from "next";
import * as cookie from "cookie"; // Fixed import

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: 405, message: "Method not allowed" });
    }

    // Clear the access token and refresh token cookies
    res.setHeader(
      "Set-Cookie",
      [
        cookie.serialize("access_token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: -1, // Expire immediately
        }),
        cookie.serialize("refresh_token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: -1, // Expire immediately
        }),
      ]
    );

    return res
      .status(200)
      .json({ status: 200, message: "Logged out successfully" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      status: 500,
      message: err instanceof Error ? err.message : "An unknown error occurred.",
    });
  }
}
