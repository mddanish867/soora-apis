import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { convertWordToPDF } from "../../../../helper/convertWordToPDF";
import logger from "../../../../lib/logger";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.body; // Pass the document ID in the request

  if (!id) {
    return res.status(400).json({ error: "Document ID is required." });
  }

  try {
    // Fetch the document from the database using Prisma
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document || !document.filePath) {
      return res.status(404).json({ error: "Document not found or file path is missing." });
    }

    const absolutePath = path.resolve(document.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File does not exist." });
    }

    // Convert Word file to PDF
    const pdfFilePath = await convertWordToPDF(absolutePath);

    // Optionally, update the document record with the PDF path and type
    await prisma.document.update({
      where: { id },
      data: {
        convertedFilePath: pdfFilePath,
        convertedType: "PDF",
      },
    });

    res.status(200).json({
      success: true,
      pdfFilePath,
    });
  } catch (error) {
    logger.error("Conversion error:", error);
    res.status(500).json({ error: "An unexpected error occurred during conversion." });
  } finally {
    await prisma.$disconnect();
  }
}
