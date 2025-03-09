import { setupProject } from "../../../lib/setupProject";
import { corsMiddleware } from "../../../lib/cors";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    const { projectName, framework, installShadCN, directory } = req.body;

    try {
        const projectPath = `${directory}/${projectName}`;
        await setupProject(projectName, projectPath, framework, installShadCN);
        return res.json({ success: true, message: "Project created successfully!" });
    } catch (error) {
        return res.status(500).json({ success: false,status: 500, message: error instanceof Error ? error.message : "An unknown error occurred.", });
    }
}
export default corsMiddleware(handler);