import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { PrismaClient } from "@prisma/client";
import { corsMiddleware } from "../../../lib/cors";
import { google } from "googleapis";
import { getLocationFromIP } from "../../../services/locationService";
import { UAParser } from "ua-parser-js";

const prisma = new PrismaClient();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, status: 405, message: "Method not allowed" });
    }

    const { code } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, status: 400, message: "Code is required." });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const { email, name, picture } = userInfo.data;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, status: 400, message: "Email not found." });
    }

    let user = await prisma.users.findUnique({
      where: { email: email as string },
    });

    if (!user) {
      user = await prisma.users.create({
        data: {
          email: email as string,
          name: name as string,
          username: email.split("@")[0], // Generate a username
          isVerified: true, // Google auth is considered verified
          picture: picture || null,
        },
      });
    }else {
        await prisma.users.update({
            where:{id: user.id},
            data:{
                picture: picture || null,
            }
        });
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets not configured");
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email || "",
        username: user.username || "",
        name: user.name || "",
        picture: picture || "",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email || "",
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    res.setHeader("Set-Cookie", [
      serialize("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60,
      }),
      serialize("refresh_token", refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7,
      }),
    ]);

    // --- Capture Session Information ---
    const uaString = req.headers["user-agent"] || "";
    const parser = new UAParser(uaString);
    const uaResult = parser.getResult();
    const device = uaResult.device.model || uaResult.os.name || "Unknown";
    const os = uaResult.os.name || "Unknown";
    const browser = uaResult.browser.name || "Unknown";

    const getClientIp = (req: NextApiRequest): string | undefined => {
      const xForwardedFor = req.headers["x-forwarded-for"];

      let ipAddress;

      if (typeof xForwardedFor === "string") {
        ipAddress = xForwardedFor.split(",")[0].trim();
      } else if (Array.isArray(xForwardedFor)) {
        ipAddress = xForwardedFor[0].split(",")[0].trim();
      } else {
        ipAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
      }

      if (ipAddress === "::1") {
        ipAddress = "127.0.0.1";
      }

      return ipAddress;
    };

    const ipAddress = getClientIp(req);

    let location = "";
    if (ipAddress) {
      location = await getLocationFromIP(ipAddress);
    } else {
      console.error("IP Address is undefined");
    }

    await prisma.userSession.create({
      data: {
        userId: user.id,
        device,
        os,
        browser,
        location,
      },
    });
    // --- End Capture ---

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Logged in successfully",
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        picture: picture,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      success: false,
      status: 500,
      message:
        err instanceof Error ? err.message : "An unknown error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);