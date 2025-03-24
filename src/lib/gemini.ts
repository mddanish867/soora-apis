import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function chatWithFile(content: string, message: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Based on this file content:
    ${content}
    
    Answer this question: ${message}
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}