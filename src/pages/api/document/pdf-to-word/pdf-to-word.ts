import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { convertPDFToWord } from "../../../../helper/convertPDFToWord";

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
        // Fetch the document from the database using Prisma
        const document = await prisma.document.findUnique({
          where: { id:documentId },
        });
    
        if (!document || !document.filePath) {
          return res.status(404).json({ error: "Document not found or file path is missing." });
        }
    
        const absolutePath = path.resolve(document.filePath);
    
        if (!fs.existsSync(absolutePath)) {
          return res.status(404).json({ error: "File does not exist." });
        }
    // Convert PDF to Word
    const conversionSuccess = await convertPDFToWord(absolutePath);

    if (!conversionSuccess) {
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Failed to convert PDF to Word.",
      });
    }

    // Update document record with the Word file details
    await prisma.document.update({
      where: { id: document.id },
      data: {
        convertedFilePath: conversionSuccess,
        convertedType: "Word",
      },
    });

    return res.status(200).json({
      success: true,
      status: 200,
      message: "PDF successfully converted to Word.",
      conversionSuccess,
    });
  } catch (error) {
    console.error("Error during PDF to Word conversion:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
}
