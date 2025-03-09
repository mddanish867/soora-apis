import { exec } from "child_process";
import fs from "fs-extra";
import path from "node:path";

export async function setupProject(
    projectName: string,
    projectPath: string,
    framework: "vite" | "next",
    installShadCN: boolean
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            fs.ensureDirSync(projectPath); // Ensure directory exists

            const baseCommand =
                framework === "vite"
                    ? `npm create vite@latest ${projectName} --template react`
                    : `npx create-next-app@latest ${projectName}`;

            exec(baseCommand, { cwd: projectPath }, (err, stdout, stderr) => {
                if (err) {
                    console.error("Error creating project:", stderr);
                    return reject(stderr);
                }

                console.log("Project Created!");

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
                        console.error("Error installing dependencies:", errout);
                        return reject(errout);
                    }

                    console.log("Dependencies Installed!");

                    const tailwindConfig = `module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};`;

                    fs.writeFileSync(path.join(projectPath, "tailwind.config.js"), tailwindConfig);

                    const indexCssPath = path.join(projectPath, "src/index.css");
                    if (fs.existsSync(indexCssPath)) {
                        fs.appendFileSync(indexCssPath, `\n@tailwind base;\n@tailwind components;\n@tailwind utilities;`);
                    }

                    console.log("Configuration Complete!");
                    resolve();
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}
