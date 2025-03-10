import { corsMiddleware } from "../../../../lib/cors";
import { NextApiRequest, NextApiResponse } from "next";
import { getDirectories } from "../../../../lib/getDirectories";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      status: 405,
      message: "Method Not Allowed",
    });
  }

  try {
    // Fetch all available drives (C:\, D:\, E:\ etc.)
    const { stdout } = await execPromise("wmic logicaldisk get name");
    const drives = stdout
      .split("\n")
      .slice(1)
      .map(line => line.trim())
      .filter(line => line);

    if (!drives.length) {
      return res.status(500).json({
        success: false,
        status: 500,
        message: "No drives found",
      });
    }

    // Get directories from each drive (only top-level folders)
    const directories: { [key: string]: string[] } = {};
    for (const drive of drives) {
      directories[drive] = await getDirectories(drive, 1);
    }

    return res.status(200).json({
      success: true,
      status: 200,
      data: directories, // Now returns all drives with their top-level directories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: error instanceof Error ? error.message : "An unknown error occurred.",
    });
  }
};

export default corsMiddleware(handler);
