import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ message: "GitHub OAuth code missing" });
  }

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ message: "GitHub OAuth credentials missing" });
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch(`https://github.com/login/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });

    const { access_token } = await tokenResponse.json();

    if (!access_token) {
      return res.status(401).json({ message: "GitHub authentication failed" });
    }

    // Fetch user data from GitHub API
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userData = await userResponse.json();

    if (!userData || !userData.id) {
      return res.status(401).json({ message: "GitHub user data not found" });
    }

    const email = userData.email ? userData.email.toString() : `github_${userData.id}@example.com`;

    const existingUser = await prisma.users.findUnique({
      where: { email: email },
    });

    let user;

    if (existingUser) {
      // If user exists, update their details
      user = await prisma.users.update({
        where: { id: existingUser.id },
        data: {
          name: userData.name || userData.login,
          picture: userData.avatar_url,
        },
      });
    } else {
      // If user doesn't exist, create a new user
      user = await prisma.users.create({
        data: {
          email: email,
          name: userData.name || userData.login,
          picture: userData.avatar_url,
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: "1h" });

    // Set token as an HTTP-only cookie
    res.setHeader("Set-Cookie", serialize("access_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/" }));

    // Redirect user to frontend with token
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
  } catch (error) {
    console.error("GitHub OAuth Error:", error);
    return res.status(500).json({ message: "GitHub authentication error" });
  }
}