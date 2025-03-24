import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from "@prisma/client";
import { chatWithFile } from '../../../lib/gemini';
import { corsMiddleware } from '../../../lib/cors';

const prisma = new PrismaClient();

const handler =  async (
  req: NextApiRequest,
  res: NextApiResponse
) =>{
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { fileId, message } = req.body;

  try {
    const file = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!file.content) {
      return res.status(400).json({ message: 'File content is empty' });
    }

    const response = await chatWithFile(file.content, message);

    const chat = await prisma.chat.create({
      data: {
        fileId,
        message,
        response,
      },
    });

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Chat processing failed' });
  }
}
export default corsMiddleware(handler);