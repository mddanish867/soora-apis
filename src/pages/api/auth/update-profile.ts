import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import { corsMiddleware } from "../../../lib/cors";

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method not allowed." });
  }

  const { email, picture, name, mobile } = req.body;

  // Validate input fields
  if (!email) {
    return res
      .status(400)
      .json({ success: false, status: 400, message: "Email is required." });
  }
  

  try {
    // Check if the 2FA is disabled
    const isUserExists = await prisma.users.findUnique({
      where: { email },
    });

   
    if (isUserExists) {
      await prisma.users.update({
        where: { email },
        data: {
            picture: picture,
            name: name,
            mobile: mobile
        },
      });
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Profile updated successfully.",
      });
    } else {
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Profile updation failed.",
      });
    }
  } catch (err) {
    // Centralized error handling
    logger.error("Error during updating the profile.", err);

    if (err instanceof Error) {
      return res
        .status(500)
        .json({ success: false, status: 500, message: err.message });
    }

    return res
      .status(500)
      .json({
        success: false,
        status: 500,
        message: "An unexpected error occurred.",
      });
  } finally {
    await prisma.$disconnect();
  }
}
export default corsMiddleware(handler);