
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import puppeteer from "puppeteer";

/**
 * Convert Word document to PDF
 * @param wordFilePath - Path to the uploaded Word file
 * @returns Path to the generated PDF file
 */
export async function convertWordToPDF(wordFilePath: string): Promise<string> {
  try {
    // 1. Read Word file and convert it to HTML
    const fileBuffer = fs.readFileSync(wordFilePath);
    const { value: htmlContent } = await mammoth.convertToHtml({ buffer: fileBuffer });

    if (!htmlContent) {
      throw new Error("Conversion to HTML returned empty content.");
    }

    // 2. Create a temporary HTML file to be rendered into a PDF
    const htmlFilePath = path.join(
      path.dirname(wordFilePath),
      `${path.basename(wordFilePath, path.extname(wordFilePath))}.html`
    );
    const pdfFilePath = path.join(
      path.dirname(wordFilePath),
      `${path.basename(wordFilePath, path.extname(wordFilePath))}.pdf`
    );

    fs.writeFileSync(htmlFilePath, htmlContent);

    // 3. Render HTML content to a PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Needed for certain environments like Vercel
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent);
    await page.pdf({ path: pdfFilePath, format: "A4" });

    await browser.close();

    // 4. Cleanup: Remove the temporary HTML file if needed
    fs.unlinkSync(htmlFilePath);

    return pdfFilePath;
  } catch (error) {
    console.error("Error during Word-to-PDF conversion:", error);
    throw new Error("Failed to convert Word document to PDF.");
  }
}
