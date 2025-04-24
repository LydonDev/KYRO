import { Command } from "commander";
import { spawn } from "child_process";
import chalk from "chalk";
import gradient from "gradient-string";

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";

const devCommand = new Command("dev")
  .description(`Build and start ${appName} production services`)
  .action(async () => {
    // Start production services
    const processes = [
      {
        name: `${appName} Backend`,
        cmd: "bun",
        args: ["run", "start"],
        cwd: "/opt/KYRO/kyro",
      },
      {
        name: `${appName} Frontend`,
        cmd: "bun",
        args: ["run", "dev"],
        cwd: "/opt/KYRO/kyro/core",
      },
      {
        name: "Krypton",
        cmd: "bun",
        args: ["run", "start"],
        cwd: "/opt/KYRO/krypton",
      },
    ];

    // Start all processes with logging
    processes.forEach((proc) => {
      const child = spawn(proc.cmd, proc.args, {
        cwd: proc.cwd,
        shell: true,
      });

      // Log output for frontend build
      if (proc.name === `${appName} Frontend`) {
        child.stdout.on("data", (data) => {
          const asciiPath = "/opt/KYRO/kyro/_ascii.txt";
          const ascii = require("fs").readFileSync(asciiPath, "utf-8");
          const asciiGradient = gradient("FFFFFF", "#a2b3ff");

          // Show production output
          console.clear();
          console.log(asciiGradient(ascii));
          console.log(
            chalk.hex("#a2b3ff")(
              "╭───────────────────────────────────────────╮",
            ),
          );
          console.log(
            chalk.hex("#a2b3ff")(
              `│ 🚀 ${appName} Production Environment            │`,
            ),
          );
          console.log(
            chalk.hex("#a2b3ff")(
              "│ 🌟 Building and starting services...      │",
            ),
          );
          console.log(
            chalk.hex("#a2b3ff")(
              "│                                           │",
            ),
          );
          console.log(
            chalk.hex("#a2b3ff")(
              "│ 🔌 API:  http://localhost:3000            │",
            ),
          );
          console.log(
            chalk.hex("#a2b3ff")(
              `│ 🖥️  ${appName}: http://localhost:5173            │`,
            ),
          );
          console.log(
            chalk.hex("#a2b3ff")(
              `│ ⚙️  ${appName}: http://localhost:8080         │`,
            ),
          );
          console.log(
            chalk.hex("#a2b3ff")(
              "╰───────────────────────────────────────────╯",
            ),
          );
          console.log("\n");
        });

        child.stderr.on("data", (data) => {
          console.log(chalk.yellow(`${data}`));
        });

        child.on("close", (code) => {
          if (code === 0) {
            console.log("this not finshed");
          } else {
            console.log(
              chalk.red(`❌ Frontend build failed with code ${code}`),
            );
            console.log(
              chalk.yellow("Please fix the TypeScript errors before building"),
            );
            process.exit(code); // Exit with the same code to indicate failure
          }
        });
      }
    });
  });

const prodCommand = new Command("prod")
  .description(`Build and start ${appName} production services`)
  .action(async () => {
    // Start production services
    const processes = [
      {
        name: `${appName} Backend`,
        cmd: "bun",
        args: ["run", "start"],
        cwd: "/opt/KYRO/kyro",
      },
      {
        name: `${appName} Frontend`,
        cmd: "bun",
        args: ["run", "build"],
        cwd: "/opt/KYRO/kyro/app",
      },
      {
        name: "Krypton",
        cmd: "bun",
        args: ["run", "start"],
        cwd: "/opt/KYRO/krypton",
      },
    ];

    // Start all processes with logging
    processes.forEach((proc) => {
      const child = spawn(proc.cmd, proc.args, {
        cwd: proc.cwd,
        shell: true,
      });

      // Log output for frontend build
      if (proc.name === `${appName} Frontend`) {
        child.stdout.on("data", (data) => {
          console.log(chalk.blue(`[Frontend Build] ${data}`));
        });

        child.stderr.on("data", (data) => {
          console.log(chalk.yellow(`${data}`));
        });

        child.on("close", (code) => {
          if (code === 0) {
            const asciiPath = "/opt/KYRO/kyro/_ascii.txt";
            const ascii = require("fs").readFileSync(asciiPath, "utf-8");
            const asciiGradient = gradient("FFFFFF", "#a2b3ff");

            // Show production output
            console.clear();
            console.log(asciiGradient(ascii));
            console.log(
              chalk.hex("#a2b3ff")(
                "╭───────────────────────────────────────────╮",
              ),
            );
            console.log(
              chalk.hex("#a2b3ff")(
                `│ 🚀 ${appName} Production Environment            │`,
              ),
            );
            console.log(
              chalk.hex("#a2b3ff")(
                "│ 🌟 Building and starting services...      │",
              ),
            );
            console.log(
              chalk.hex("#a2b3ff")(
                "│                                           │",
              ),
            );
            console.log(
              chalk.hex("#a2b3ff")(
                `│ 🖥️  ${appName}: http://localhost:5173            │`,
              ),
            );
            console.log(
              chalk.hex("#a2b3ff")(
                `│ ⚙️  Krypton: http://localhost:8080         │`,
              ),
            );
            console.log(
              chalk.hex("#a2b3ff")(
                "╰───────────────────────────────────────────╯",
              ),
            );
            console.log("\n");
          } else {
            console.log(
              chalk.red(`❌ Frontend build failed with code ${code}`),
            );
            console.log(
              chalk.yellow("Please fix the TypeScript errors before building"),
            );
            process.exit(code); // Exit with the same code to indicate failure
          }
        });
      }
    });
  });

export { devCommand, prodCommand };
