import { exec } from "child_process";

export const convertPDFToWord = (pdfPath: string, wordPath: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const command = `soffice --headless --convert-to docx --outdir "${path.dirname(wordPath)}" "${pdfPath}"`;

    exec(command, (error) => {
      if (error) {
        console.error("Error converting PDF to Word:", error);
        return reject(false);
      }
      resolve(true);
    });
  });
};
