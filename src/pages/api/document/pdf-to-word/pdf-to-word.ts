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
    const document = await prisma.document.findUnique({
      where: { id: Number(documentId) },
    });

    if (!document || document.type !== "PDF") {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "PDF document not found.",
      });
    }

    const wordFilePath = path.join(
      path.dirname(document.filePath),
      `${path.basename(document.filePath, path.extname(document.filePath))}.docx`
    );

    // Convert PDF to Word
    const conversionSuccess = await convertPDFToWord(document.filePath, wordFilePath);

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
        convertedFilePath: wordFilePath,
        convertedType: "Word",
      },
    });

    return res.status(200).json({
      success: true,
      status: 200,
      message: "PDF successfully converted to Word.",
      wordFilePath,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
}
