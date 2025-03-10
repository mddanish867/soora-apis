import { exec } from "child_process";
import fs from "fs-extra";
import path from "path";

export async function setupProject(
  projectName: string,
  directory: string,
  framework: "vite" | "next",
  installShadCN: boolean
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const projectPath = path.join(directory, projectName);
      fs.ensureDirSync(directory); // Ensure base directory exists
      console.log(
        "🚀 ~ file: setupProject.ts ~ line 22 ~ setupProject ~ projectPath",
        projectPath
      );
      // Step 1: Create Project (Run in Parent Directory)
      const baseCommand =
        framework === "vite"
          ? `npm create vite@latest ${projectName} -- --template react`
          : `npx create-next-app@latest ${projectName}`;

      console.log(
        "🚀 ~ file: setupProject.ts ~ line 28 ~ setupProject ~ baseCommand",
        baseCommand
      );

      exec(
        baseCommand,
        {
          cwd: directory,
          shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
        },
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error("❌ Error creating project:", stderr);
            return reject(new Error(stderr || "Project creation failed"));
          }
          console.log("✅ Project Created!");

          // Step 2: Install Tailwind & Configure It
          let installCommands =
            process.platform === "win32"
              ? `cd /d ${projectPath} && npm install && npm install -D tailwindcss@3.4.1 postcss autoprefixer && npx tailwindcss init -p`
              : `cd ${projectPath} && npm install && npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`;

              if (installShadCN) {
                installCommands += ` && npm install @shadcn/ui && npx shadcn-ui@latest init -y`;
              }
              

          console.log("🚀 ~ installCommands:", installCommands);

          exec(
            installCommands,
            {
              cwd: projectPath,
              shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
            },
            (error: Error | null, _stdout: string, errout: string) => {
              if (error) {
                console.error("❌ Error installing dependencies:", errout);
                return reject(
                  new Error(errout || "Dependency installation failed")
                );
              }

              console.log("✅ Dependencies Installed!");

              // Step 3: Tailwind Configuration
              const tailwindConfigContent =
                framework === "vite"
                  ? `module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};`
                  : `module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};`;
              console.log(
                "🚀 ~ file: setupProject.ts ~ line 74 ~ setupProject ~ tailwindConfigContent",
                tailwindConfigContent
              );
              fs.writeFileSync(
                path.join(projectPath, "tailwind.config.js"),
                tailwindConfigContent
              );
              const indexCssPath = path.join(
                projectPath,
                framework === "vite" ? "src/index.css" : "styles/globals.css"
              );

              console.log("🚀 Checking index.css path:", indexCssPath);

              // Ensure the file exists by creating it if missing
              if (!fs.existsSync(indexCssPath)) {
                console.warn("⚠️ index.css not found. Creating it...");
                fs.writeFileSync(indexCssPath, ""); // Create an empty file
              }

              // Overwrite the file (removes all existing content)
              fs.writeFileSync(
                indexCssPath,
                `@tailwind base;\n@tailwind components;\n@tailwind utilities;`
              );

              console.log("✅ Tailwind classes added successfully!");

              resolve();
            }
          );
        }
      );
    } catch (error) {
      reject(
        error instanceof Error ? error : new Error("Unknown Error Occurred")
      );
    }
  });
}
