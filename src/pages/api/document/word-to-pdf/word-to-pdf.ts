import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import logger from "../../../../lib/logger";
import { convertWordToPDF } from "../../../../helper/convertWordToPDF";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      status: 405,
      message: "Method not allowed.",
    });
  }

  const { documentId } = req.body;

  if (!documentId) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Document ID is required.",
    });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.filePath) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Document not found or file path is null.",
      });
    }

    const wordFilePath = path.resolve(document.filePath);

    if (!fs.existsSync(wordFilePath)) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Uploaded document file is missing.",
      });
    }

    // Convert Word file to PDF
    const pdfFilePath = await convertWordToPDF(wordFilePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${path.basename(pdfFilePath)}`
    );
    fs.createReadStream(pdfFilePath).pipe(res);
  } catch (error) {
    logger.error("Conversion error:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
}
