import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import logger from "../../../../lib/logger";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      status: 405,
      message: "Method not allowed.",
    });
  }

  const { documentId } = req.query;

  if (!documentId) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Document ID is required.",
    });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: Number(documentId) },
    });

    if (!document || !document.filePath) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Document not found or file path is null.",
      });
    }

    // Construct the file path for the PDF file
    const pdfFilePath = path.join(
      path.dirname(document.filePath),
      `${path.basename(document.filePath, path.extname(document.filePath))}.pdf`
    );

    if (!fs.existsSync(pdfFilePath)) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "PDF file not found.",
      });
    }

    // Send the PDF file as a response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(pdfFilePath)}"`
    );
    fs.createReadStream(pdfFilePath).pipe(res);
  } catch (error) {
    logger.error("Error during file download:", error);

    return res.status(500).json({
      success: false,
      status: 500,
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
}
