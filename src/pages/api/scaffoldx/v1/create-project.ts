import { setupProject } from "../../../../lib/setupProject";
import { corsMiddleware } from "../../../../lib/cors";
import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs-extra";
import path from "path"; // ✅ Import the missing path module

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, status: 405, message: "Method Not Allowed" });
  }

  const { projectName, framework, installShadCN, directory } = req.body;
  console.log("🚀 ~ file: create-project.ts ~ line 10 ~ handler ~ req.body", req.body);

  if (!projectName || !framework || !directory) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Missing required fields.",
    });
  }

  try {
    // Ensure directory exists
    const safeDirectory = path.resolve(directory); // ✅ path is now recognized
    if (!fs.existsSync(safeDirectory)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `Invalid directory path: ${safeDirectory} does not exist.`,
      });
    }
console.log("🚀 ~ file: create-project.ts ~ line 33 ~ handler ~ safeDirectory", safeDirectory);
    await setupProject(projectName, safeDirectory, framework, installShadCN);
    console.log("✅ Project Created!");
    return res.json({
      success: true,
      status: 200,
      message: `Project "${projectName}" created successfully in ${safeDirectory}!`,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: error instanceof Error ? error.message : "An unknown error occurred.",
    });
  }
};

export default corsMiddleware(handler);
