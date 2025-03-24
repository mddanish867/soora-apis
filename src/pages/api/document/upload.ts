import type { NextApiRequest, NextApiResponse } from 'next';
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { processFile } from '../../../lib/fileProcessor';
import { corsMiddleware } from '../../../lib/cors';
const upload = multer({ storage: multer.memoryStorage() });

export const config = {
  api: {
    bodyParser: false,
  },
};

// Define the response type
interface UploadResponse {
  id: string;
  name: string;
  type: string;
  preview: string;
}

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Type assertion for multer
  const multerHandler = upload.single('file');
  multerHandler(req as any, res as any, async (err: any) => {
    if (err) {
      return res.status(500).json({ message: 'Upload failed', error: err.message });
    }

    try {
      // Type the file properly
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
 
      const content = await processFile(file);

      const uploadedFile = await prisma.uploadedFile.create({
        data: {
          name: file.originalname,
          content,
          type: file.mimetype,
        },
      });

      res.status(200).json({
        id: uploadedFile.id,
        name: uploadedFile.name,
        type: uploadedFile.type,
        preview: content.substring(0, 500), // Limited preview
      }as UploadResponse);
    } catch (error) {
      res.status(500).json({ message: 'Processing failed' });
    }
  });
};

export default corsMiddleware(handler);