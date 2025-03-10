import fs from "fs";
import path from "path";

export const getDirectories = async (dir: string, depth: number = 2): Promise<string[]> => {
  const directories: string[] = [];

  if (depth === 0) return directories; // Stop recursion at depth limit

  try {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      if (file.isDirectory()) {
        const filePath: string = path.join(dir, file.name);
        directories.push(filePath);
        const subDirs: string[] = await getDirectories(filePath, depth - 1);
        directories.push(...subDirs);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${(error as Error).message}`);
  }

  return directories;
};
