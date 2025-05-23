import { Command } from "commander";
import { spawn, exec } from "child_process";
import chalk from "chalk";
import gradient from "gradient-string";
import fs from "fs";
import path from "path";
import figlet from "figlet";
import { APP_NAME, KYRO_VERSION, LOGS_DIR, API_URL, API_PORT, APP_URL, APP_PORT } from "../config";

const stopServerOnPort = (port: number) => {
  return new Promise<void>((resolve, reject) => {
    exec(`lsof -ti:${port}`, (err, stdout) => {
      if (err || !stdout) {
        return resolve();
      }
      const pid = stdout.trim();
      exec(`kill -9 ${pid}`, (killErr) => {
        if (killErr) {
          reject(`Failed to stop server on port ${port}`);
        } else {
          console.log(chalk.yellow(`Stopped server on port ${port}`));
          resolve();
        }
      });
    });
  });
};

const stopAllServers = async () => {
  await Promise.all([3000, 5173, 8080].map(stopServerOnPort));
};

figlet(APP_NAME, (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  fs.writeFileSync(`./${APP_NAME}.txt`, data, "utf-8");
});

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export const checkVersionCommand = new Command("check-version")
  .description(`Check if your ${APP_NAME} installation is up to date`)
  .action(async () => {
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/LydonDev/KYRO-VERSION/main/VERSION.MD",
      );
      const remoteVersion = (await res.text()).trim();
      const result = compareVersions(KYRO_VERSION, remoteVersion);

      if (result < 0) {
        console.log(
          chalk.hex("#a2b3ff")(
            "╭────────────────────────────────────────────╮",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│ 🚀 ${APP_NAME} Environment                        │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "│ 🌟 Checking Version                        │",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "│                                            │",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│ 🧩 Version: Your version (${KYRO_VERSION}) is         │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│  outdated. Latest is ${remoteVersion}.                │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "╰────────────────────────────────────────────╯\n",
          ),
        );
      } else if (result > 0) {
        console.log(
          chalk.hex("#a2b3ff")(
            "╭────────────────────────────────────────────╮",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│ 🚀 ${APP_NAME} Environment                        │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "│ 🌟 Checking Version                        │",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "│                                            │",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│ 🧩 Version: You are ahead of the official  │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│  version Current: ${KYRO_VERSION}, Latest: ${remoteVersion}    │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "╰────────────────────────────────────────────╯\n",
          ),
        );
      } else {
        console.log(
          chalk.hex("#a2b3ff")(
            "╭────────────────────────────────────────────╮",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│ 🚀 ${APP_NAME} Environment                        │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "│ 🌟 Checking Version                        │",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "│                                            │",
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            `│ 🧩 Version: ${KYRO_VERSION} (Up to date)             │`,
          ),
        );
        console.log(
          chalk.hex("#a2b3ff")(
            "╰────────────────────────────────────────────╯\n",
          ),
        );
      }
    } catch (err: any) {
      console.error(chalk.red("Failed to check version:"), err.message);
    }
  });

const compareVersions = (v1: string, v2: string): number => {
  const a = v1.split(".").map(Number);
  const b = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const n1 = a[i] || 0;
    const n2 = b[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

const printVersionStatus = async () => {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/LydonDev/KYRO-VERSION/main/VERSION.MD",
    );
    const remoteVersion = (await res.text()).trim();
    const result = compareVersions(KYRO_VERSION, remoteVersion);

    const versionLine = chalk.hex("#a2b3ff")(`│ 🧩 Version: ${KYRO_VERSION}`);
    const statusLine =
      result < 0
        ? chalk.red(" (Outdated)")
        : result > 0
          ? chalk.yellow(" (Ahead of official)")
          : chalk.green(" (Up to date)");

    return chalk.hex("#a2b3ff")(`${versionLine}${statusLine.padEnd(36)}│`);
  } catch {
    return chalk.red("⚠️  Version check failed");
  }
};

const printBanner = async () => {
  const asciiPath = `/opt/KYRO/kyro/${APP_NAME}.txt`;
  const ascii = fs.readFileSync(asciiPath, "utf-8");
  const asciiGradient = gradient("FFFFFF", "#a2b3ff");

  console.clear();
  console.log(asciiGradient(ascii));
  console.log(
    chalk.hex("#a2b3ff")("╭────────────────────────────────────────────╮"),
  );
  console.log(
    chalk.hex("#a2b3ff")(
      `│ 🚀 ${APP_NAME} Environment                        │`,
    ),
  );
  console.log(
    chalk.hex("#a2b3ff")("│ 🌟 Launching services...                   │"),
  );
  console.log(
    chalk.hex("#a2b3ff")("│                                            │"),
  );
  console.log(await printVersionStatus());
  console.log(
    chalk.hex("#a2b3ff")("│                                            │"),
  );
  console.log(
    chalk.hex("#a2b3ff")(`│ 🔌 API: ${API_URL}:${API_PORT}              │`),
  );
  console.log(
    chalk.hex("#a2b3ff")(
      `│ 🖥️  ${APP_NAME}: ${APP_URL}:${APP_PORT}             │`,
    ),
  );
  console.log(
    chalk.hex("#a2b3ff")("│ ⚙️  Krypton: http://localhost:8080          │"),
  );
  console.log(
    chalk.hex("#a2b3ff")("╰────────────────────────────────────────────╯\n"),
  );
};

const formatLogLine = (data: Buffer): string => {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  return (
    data
      .toString()
      .split("\n")
      .filter(Boolean)
      .map((line) => `[${timestamp}] ${line}`)
      .join("\n") + "\n"
  );
};

const spawnWithLogs = (proc: {
  name: string;
  cmd: string;
  args: string[];
  cwd: string;
}) => {
  const logPath = path.join(
    LOGS_DIR,
    `${proc.name.replace(/\s+/g, "_").toLowerCase()}.log`,
  );
  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  const child = spawn(proc.cmd, proc.args, { cwd: proc.cwd });

  child.stdout.on("data", (data) => {
    logStream.write(formatLogLine(data));
  });

  child.stderr.on("data", (data) => {
    logStream.write(formatLogLine(data));
  });

  child.on("close", () => {
    logStream.end();
  });

  return child;
};

export const devCommand = new Command("development")
  .description(`Run ${APP_NAME} in development mode`)
  .action(async () => {
    const os = require("os");

    await stopAllServers();

    const processes = [
      {
        name: "dist",
        cmd: "rm",
        args: ["-rf", "dist"],
        cwd: "/opt/KYRO/kyro/core",
      },
      {
        name: `${APP_NAME} Backend`,
        cmd: "bun",
        args: ["run", "dev"],
        cwd: "/opt/KYRO/kyro",
      },
      {
        name: `${APP_NAME} Frontend`,
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

    let bannerPrinted = false;

    setTimeout(() => {
      require("child_process").exec(
        `${os.platform() === "win32" ? "start" : os.platform() === "darwin" ? "open" : "xdg-open"} ${APP_URL}:${APP_PORT}`,
      );
    }, 1000);

    processes.forEach((proc) => {
      const child = spawnWithLogs(proc);

      if (proc.name === `${APP_NAME} Frontend`) {
        child.stdout.on("data", async (data) => {
          if (!bannerPrinted) {
            bannerPrinted = true;
            await printBanner();
          }
        });

        child.stderr.on("data", (data) => {
          console.log(chalk.yellow(`${data}`));
        });

        child.on("close", (code) => {
          if (code !== 0) {
            console.log(
              chalk.red(`❌ Frontend process exited with code ${code}`),
            );
            process.exit(code);
          }
        });
      }
    });
  });

export const prodCommand = new Command("production")
  .description(`Run ${APP_NAME} in production mode`)
  .action(async () => {
    const os = require("os");

    await stopAllServers();

    const processes = [
      {
        name: "dist",
        cmd: "rm",
        args: ["-rf", "dist"],
        cwd: "/opt/KYRO/kyro/core",
      },
      {
        name: `${APP_NAME} Frontend`,
        cmd: "bun",
        args: ["run", "build"],
        cwd: "/opt/KYRO/kyro/core",
      },
      {
        name: `${APP_NAME} Backend`,
        cmd: "bun",
        args: ["run", "dev"],
        cwd: "/opt/KYRO/kyro",
      },
      {
        name: "Krypton",
        cmd: "bun",
        args: ["run", "dev"],
        cwd: "/opt/KYRO/krypton",
      },
    ];

    let bannerPrinted = false;

    setTimeout(() => {
      require("child_process").exec(
        `${os.platform() === "win32" ? "start" : os.platform() === "darwin" ? "open" : "xdg-open"} ${APP_URL}:${APP_PORT}`,
      );
    }, 1000);

    processes.forEach((proc) => {
      const child = spawnWithLogs(proc);

      if (proc.name === `${APP_NAME} Frontend`) {
        child.stdout.on("data", async (data) => {
          if (!bannerPrinted) {
            bannerPrinted = true;
            await printBanner();
          }
        });

        child.stderr.on("data", (data) => {
          console.log(chalk.yellow(`${data}`));
        });

        child.on("close", (code) => {
          if (code !== 0) {
            console.log(
              chalk.red(`❌ Frontend process exited with code ${code}`),
            );
            process.exit(code);
          }
        });
      }
    });
  });

export const logsClearCommand = new Command("clear:logs")
  .description("Clear all log files")
  .action(() => {
    const clearLogsDirectory = () => {
      exec(`rm -rf ./logs`, (err) => {
        if (err) {
          console.error(
            chalk.red("Error clearing logs directory:"),
            err.message,
          );
        } else {
          console.log(chalk.green("Logs directory cleared successfully."));
        }
      });
    };
    clearLogsDirectory();
  });

export const logsCommand = new Command("logs")
  .description(`View logs for ${APP_NAME}`)
  .action(() => {
    const http = require("http");
    const path = require("path");
    const fs = require("fs");
    const os = require("os");

    const port = 4321;
    const logsPath = LOGS_DIR;
    const highlightJsCdn =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
    const highlightCssCdn =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css";

    function getLogFiles() {
      try {
        return fs.readdirSync(logsPath).filter((f) => f.endsWith(".log"));
      } catch {
        return [];
      }
    }

    function serveIndex(res) {
      const files = getLogFiles();
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>${APP_NAME} Logs</title>
  <link rel="stylesheet" href="${highlightCssCdn}">
  <style>body{font-family:sans-serif;padding:2em;}pre{background:#222;color:#eee;padding:1em;overflow:auto;}</style>
</head>
<body>
  <h2>${APP_NAME} Logs</h2>
  <ul>
    ${files.map((f) => `<li><a href="/log/${encodeURIComponent(f)}">${f}</a></li>`).join("")}
  </ul>
  <hr>
  <small>Click a log file to view its contents.</small>
</body>
</html>`);
    }

    function serveLogFile(res, fileName) {
      const safeName = path.basename(fileName);
      const fullPath = path.join(logsPath, safeName);
      if (!fs.existsSync(fullPath)) {
        res.writeHead(404);
        res.end("Log file not found");
        return;
      }
      fs.readFile(fullPath, "utf-8", (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end("Error reading file");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>${safeName}</title>
  <link rel="stylesheet" href="${highlightCssCdn}">
  <style>body{font-family:sans-serif;padding:2em;}pre{background:#222;color:#eee;padding:1em;overflow:auto;}</style>
</head>
<body>
  <h3><a href="/">&larr; ${APP_NAME} Logs</a> / ${safeName}</h3>
  <pre class="hljs">${data}</pre>
  <script src="${highlightJsCdn}"></script>
  <script>hljs.highlightAll();</script>
</body>
</html>`);
      });
    }

    setTimeout(() => {
      require("child_process").exec(
        `${os.platform() === "win32" ? "start" : os.platform() === "darwin" ? "open" : "xdg-open"} ${APP_URL}:${port}`,
      );
    }, 5000);

    const server = http.createServer((req, res) => {
      const urlParts = req.url.split("/");
      const resource = urlParts[1];
      if (resource === "log" && urlParts[2]) {
        serveLogFile(res, urlParts[2]);
      } else {
        serveIndex(res);
      }
    });

    server.listen(port, () => {
      const asciiPath = "/opt/KYRO/kyro/_ascii.txt";
      const ascii = fs.readFileSync(asciiPath, "utf-8");
      const asciiGradient = gradient("FFFFFF", "#a2b3ff");

      console.clear();
      console.log(asciiGradient(ascii));
      console.log(
        chalk.hex("#a2b3ff")("╭────────────────────────────────────────────╮"),
      );
      console.log(
        chalk.hex("#a2b3ff")(
          `│ 🚀 ${APP_NAME} Environment                        │`,
        ),
      );
      console.log(
        chalk.hex("#a2b3ff")("│ 🌟 Launching logs site...                  │"),
      );
      console.log(
        chalk.hex("#a2b3ff")("│                                            │"),
      );
      console.log(
        chalk.hex("#a2b3ff")(`│ ⚙️  Logs: ${APP_URL}:${port}             │`),
      );
      console.log(
        chalk.hex("#a2b3ff")(
          "╰────────────────────────────────────────────╯\n",
        ),
      );
    });
  });
