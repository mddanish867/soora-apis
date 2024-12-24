import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function convertPDFToWord(pdfPath: string): Promise<string> {
  try {
    // 1. Generate HTML content from the PDF using Puppeteer or any other PDF-to-HTML tool (for example pdf2htmlEX)
    const htmlFilePath = path.join(
      path.dirname(pdfPath),
      `${path.basename(pdfPath, path.extname(pdfPath))}.html`
    );
    const wordFilePath = path.join(
      path.dirname(pdfPath),
      `${path.basename(pdfPath, path.extname(pdfPath))}.docx`
    );

    // Generate HTML from the PDF using Puppeteer (simulating the conversion)
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Needed for certain environments like Vercel
    });

    const page = await browser.newPage();
    await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(`<html><body><h1>Simulated PDF-to-HTML</h1></body></html>`)); // Placeholder content for demo
    await page.pdf({ path: htmlFilePath }); // Simulating an HTML rendering, replace this with PDF to HTML actual conversion logic
    
    await browser.close();

    // 2. Convert HTML to Word using mammoth.js (from HTML to Word)
    const htmlContent = fs.readFileSync(htmlFilePath, "utf8");

    if (!htmlContent) {
      throw new Error("Conversion to HTML returned empty content.");
    }

    // Write converted content into a DOCX file, replace this with actual logic to convert HTML to Word
    // Placeholder logic, assuming HTML-to-Word using an external tool
    await fs.promises.writeFile(wordFilePath, htmlContent);

    // 3. Cleanup: Remove the temporary HTML file if needed
    fs.unlinkSync(htmlFilePath);

    return wordFilePath;
  } catch (error) {
    console.error("Error during PDF-to-Word conversion:", error);
    throw new Error("Failed to convert PDF document to Word.");
  }
}
