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

      // Step 1: Create Project (Run in Parent Directory)
      const baseCommand =
        framework === "vite"
          ? `npm create vite@latest ${projectName} --template react`
          : `npx create-next-app@latest ${projectName}`;

      exec(baseCommand, { cwd: directory }, (err, stdout, stderr) => {
        if (err) {
          console.error("❌ Error creating project:", stderr);
          return reject(new Error(stderr || "Project creation failed"));
        }
        console.log("✅ Project Created!");

        // Step 2: Install Tailwind & Configure It
        let installCommands = `
          cd ${projectPath} &&
          npm install &&
          npm install -D tailwindcss postcss autoprefixer &&
          npx tailwindcss init -p
        `;

        if (installShadCN) {
          installCommands += ` && npm install @shadcn/ui`;
        }

        exec(installCommands, { cwd: projectPath }, (error, out, errout) => {
          if (error) {
            console.error("❌ Error installing dependencies:", errout);
            return reject(new Error(errout || "Dependency installation failed"));
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

          fs.writeFileSync(
            path.join(projectPath, "tailwind.config.js"),
            tailwindConfigContent
          );

          const indexCssPath = path.join(projectPath, "src/index.css");
          if (fs.existsSync(indexCssPath)) {
            fs.appendFileSync(
              indexCssPath,
              `\n@tailwind base;\n@tailwind components;\n@tailwind utilities;`
            );
          }

          console.log("✅ Tailwind Configured!");
          resolve();
        });
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Unknown Error Occurred"));
    }
  });
}
