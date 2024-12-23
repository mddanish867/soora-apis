import { NextApiRequest, NextApiResponse } from "next";
import { SSOService } from "../../../helper/SSOService ";
import { rateLimit } from "../../../helper/rateLimit ";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";

const ssoConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.APP_URL}/api/auth/callback/google`,
  provider: "google" as const,
};

const ssoService = new SSOService(ssoConfig);

// Rate limit configurations
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  keyPrefix: "login:",
});

const refreshRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 refresh attempts per hour
  keyPrefix: "refresh:",
});

// Login endpoint
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await loginRateLimit(req, res, async () => {
    const { provider } = req.query;

    switch (req.method) {
      case "GET":
        try {
          const state = nanoid();
          res.setHeader(
            "Set-Cookie",
            `sso_state=${state}; HttpOnly; Path=/; MaxAge=3600; SameSite=Lax`
          );

          const authUrl = await ssoService.getAuthUrl(state);
          res.redirect(authUrl);
        } catch (error) {
          console.error("SSO initialization error:", error);
          res
            .status(500)
            .json({
              success: false,
              status: 500,
              error: "Failed to initialize SSO",
            });
        }
        break;

      default:
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  });
}

// Callback endpoint
export async function callbackHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, state } = req.query;

  try {
    const storedState = req.cookies.sso_state;
    if (state !== storedState) {
      throw new Error("Invalid state parameter");
    }

    const { user, tokens } = await ssoService.handleCallback(code as string);

    // Clear state cookie
    res.setHeader("Set-Cookie", [
      "sso_state=; HttpOnly; Path=/; MaxAge=0",
      `access_token=${tokens.accessToken}; HttpOnly; Path=/; MaxAge=${tokens.expiresIn}; SameSite=Lax`,
      `refresh_token=${tokens.refreshToken}; HttpOnly; Path=/; MaxAge=604800; SameSite=Lax`, // 7 days
    ]);

    res.redirect("/dashboard");
  } catch (error) {
    console.error("SSO callback error:", error);
    res.redirect("/auth/error");
  }
}

// Token refresh endpoint
export async function refreshHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await refreshRateLimit(req, res, async () => {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, status: 405, error: "Method not allowed" });
    }

    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res
        .status(401)
        .json({
          success: false,
          status: 401,
          error: "No refresh token provided",
        });
    }

    try {
      const tokens = await ssoService.refreshTokens(refreshToken);
      if (!tokens) {
        return res
          .status(401)
          .json({
            success: false,
            status: 401,
            error: "Invalid refresh token",
          });
      }

      res.setHeader("Set-Cookie", [
        `access_token=${tokens.accessToken}; HttpOnly; Path=/; MaxAge=${tokens.expiresIn}; SameSite=Lax`,
        `refresh_token=${tokens.refreshToken}; HttpOnly; Path=/; MaxAge=604800; SameSite=Lax`,
      ]);

      res.json({ success: true, expiresIn: tokens.expiresIn });
    } catch (error) {
      console.error("Token refresh error:", error);
      res
        .status(401)
        .json({
          success: false,
          status: 401,
          error: "Failed to refresh tokens",
        });
    }
  });
}

// Logout endpoint
export async function logoutHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, error: "Method not allowed" });
  }

  try {
    const accessToken = req.cookies.access_token;
    if (accessToken) {
      const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET!
      ) as jwt.JwtPayload;
      await ssoService.revokeTokens(decoded.userId);
    }

    res.setHeader("Set-Cookie", [
      "access_token=; HttpOnly; Path=/; MaxAge=0",
      "refresh_token=; HttpOnly; Path=/; MaxAge=0",
    ]);

    res.json({ success: true, status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    res
      .status(500)
      .json({ success: false, status: 500, error: "Failed to logout" });
  }
}
