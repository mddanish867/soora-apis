import { NextApiRequest, NextApiResponse } from "next";
import formidable, { File } from "formidable";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import logger from "../../../../lib/logger";

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure directories exist
const ensureDirectoriesExist = () => {
  const uploadDir = path.resolve("./uploads");
  const wordDir = path.join(uploadDir, "word");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  if (!fs.existsSync(wordDir)) {
    fs.mkdirSync(wordDir);
  }
};

// Parse form helper
const parseForm = (req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  const form = formidable({
    uploadDir: path.resolve("./uploads/word"),
    keepExtensions: true,
    multiples: false,
    allowEmptyFiles: false,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      status: 405,
      message: "Method not allowed.",
    });
  }

  try {
    ensureDirectoriesExist();

    const { files } = await parseForm(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !file.filepath || !file.originalFilename) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "No file uploaded or invalid file format.",
      });
    }

    const document = await prisma.document.create({
      data: {
        fileName: file.originalFilename,
        filePath: "",
        type: "word",
      },
    });

    const fileExtension = path.extname(file.originalFilename);
    const finalFilename = `${document.id}${fileExtension}`;
    const finalPath = path.join("uploads", "word", finalFilename);
    const absoluteFinalPath = path.resolve(`./${finalPath}`);

    fs.renameSync(file.filepath, absoluteFinalPath);

    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: { filePath: finalPath },
    });

    return res.status(200).json({
      success: true,
      status: 200,
      message: "File uploaded successfully.",
      data: updatedDocument,
    });
  } catch (error) {
    logger.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
}
