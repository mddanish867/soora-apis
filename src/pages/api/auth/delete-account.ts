// import { NextApiRequest, NextApiResponse } from "next";
// import { PrismaClient } from "@prisma/client";
// import logger from "../../../lib/logger";
// import bcrypt from "bcryptjs";
// import { corsMiddleware } from "../../../lib/cors";

// const prisma = new PrismaClient();

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
//   if (req.method !== "POST") {
//     return res
//       .status(405)
//       .json({ success: false, status: 405, message: "Method not allowed." });
//   }

//   const { email, password, reason } = req.body;

//   // Validate input fields
//   if (!email || !password) {
//     return res.status(400).json({
//       success: false,
//       status: 400,
//       message: "Email and password are required.",
//     });
//   }

//   if (!reason) {
//     return res.status(400).json({
//       success: false,
//       status: 400,
//       message: "Please provide a reason for account deletion.",
//     });
//   }

//   try {
//     // Find the user
//     const user = await prisma.users.findUnique({
//       where: { email },
//     });

//     if (!user || !user.password) {
//       return res.status(404).json({
//         success: false,
//         status: 404,
//         message: "User not found.",
//       });
//     }

//     // Verify password
//     const isPasswordValid = await bcrypt.compare(password, user.password);

//     if (!isPasswordValid) {
//       return res.status(401).json({
//         success: false,
//         status: 401,
//         message: "Incorrect password.",
//       });
//     }

//     // Create deletion record before deleting the user
//     await prisma.accountDeletions.create({
//       data: {
//         userId: user.id,
//         email: user.email,
//         reason: reason,
//         deletedAt: new Date(),
//       },
//     });

//     // Delete user's related data first (if you have any)
//     // Example:
//     // await prisma.userPreferences.deleteMany({ where: { userId: user.id } });
//     // await prisma.userSessions.deleteMany({ where: { userId: user.id } });

//     // Delete the user
//     await prisma.users.delete({
//       where: { email },
//     });

//     // Log the deletion
//     logger.info(`Account deleted successfully for user: ${email}`);

//     return res.status(200).json({
//       success: true,
//       status: 200,
//       message: "Account has been deleted successfully.",
//     });

//   } catch (err) {
//     // Centralized error handling
//     logger.error("Error during account deletion:", err);

//     if (err instanceof Error) {
//       return res
//         .status(500)
//         .json({ success: false, status: 500, message: err.message });
//     }

//     return res.status(500).json({
//       success: false,
//       status: 500,
//       message: "An unexpected error occurred.",
//     });
//   } finally {
//     await prisma.$disconnect();
//   }
// };

// export default corsMiddleware(handler);
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import logger from "../../../lib/logger";
import bcrypt from "bcryptjs";
import { corsMiddleware } from "../../../lib/cors";
import { serialize } from "cookie";

const prisma = new PrismaClient();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: -1, // Immediately expire the cookie
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method not allowed." });
  }

  const { email, password, reason } = req.body;

  // Validate input fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Email and password are required.",
    });
  }

  if (!reason) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Please provide a reason for account deletion.",
    });
  }

  try {
    // Find the user
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: "Incorrect password.",
      });
    }

    // Create deletion record before deleting the user
    await prisma.accountDeletions.create({
      data: {
        userId: user.id,
        email: user.email,
        reason: reason,
        deletedAt: new Date(),
      },
    });

    // Delete the user
    await prisma.users.delete({
      where: { email },
    });

    // Clear cookies
    res.setHeader("Set-Cookie", [
      serialize("access_token", "", cookieOptions),
      serialize("refresh_token", "", cookieOptions),
    ]);

    // Log the deletion
    logger.info(`Account deleted successfully for user: ${email}`);

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Account has been deleted successfully, and cookies have been cleared.",
    });
  } catch (err) {
    // Centralized error handling
    logger.error("Error during account deletion:", err);

    if (err instanceof Error) {
      return res
        .status(500)
        .json({ success: false, status: 500, message: err.message });
    }

    return res.status(500).json({
      success: false,
      status: 500,
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export default corsMiddleware(handler);
