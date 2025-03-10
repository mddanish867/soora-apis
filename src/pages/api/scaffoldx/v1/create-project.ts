import { setupProject } from "../../../../lib/setupProject";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, status: 405, message: "Method Not Allowed" });
  }

  const { projectName, framework, installShadCN, directory } = req.body;

  if (!projectName || !framework || !directory) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Missing required fields.",
    });
  }

  try {
    await setupProject(projectName, directory, framework, installShadCN);
    return res.json({
      success: true,
      status: 200,
      message: "Project created successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 500,
      message:
        error instanceof Error ? error.message : "An unknown error occurred.",
    });
  }
};

export default handler;
