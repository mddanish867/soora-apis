import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export async function processFile(file: Express.Multer.File): Promise<string> {
  const buffer = file.buffer;

  switch (file.mimetype) {
    case 'application/pdf':
      const pdfData = await pdf(buffer);
      return pdfData.text;

    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      const workbook = XLSX.read(buffer);
      return XLSX.utils.sheet_to_txt(workbook.Sheets[workbook.SheetNames[0]]);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      const wordResult = await mammoth.extractRawText({ buffer });
      return wordResult.value;

    case 'application/json':
      return JSON.parse(buffer.toString());

    case 'text/plain':
      return buffer.toString();

    default:
      throw new Error('Unsupported file type');
  }
}