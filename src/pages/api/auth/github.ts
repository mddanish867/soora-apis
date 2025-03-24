import { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/github/callback`;

  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ message: "GitHub OAuth credentials missing" });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user:email`;

  return res.redirect(githubAuthUrl);
}
