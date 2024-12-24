import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function convertWordToPDF(wordFilePath: string): Promise<string> {
  const pdfFilePath = path.join(
    path.dirname(wordFilePath),
    `${path.basename(wordFilePath, path.extname(wordFilePath))}.pdf`
  );

  try {
    // Use LibreOffice to convert Word to PDF
    const command = `libreoffice --headless --convert-to pdf --outdir ${path.dirname(
      wordFilePath
    )} ${wordFilePath}`;
    await execPromise(command);
    return pdfFilePath;
  } catch (error) {
    throw new Error("Failed to convert Word document to PDF.");
  }
}
