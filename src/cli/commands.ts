import { Command } from "commander";
import { spawn, exec } from "child_process";
import chalk from "chalk";
import gradient from "gradient-string";
import fs from "fs";
import path from "path";
import figlet from "figlet";

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

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";
const localVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";
const logsDir = import.meta.env.LOGS_DIR || "./logs";

figlet(appName, (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  fs.writeFileSync("./_ascii.txt", data, "utf-8");
});

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const checkVersionCommand = new Command("check-version")
  .description(`Check if your ${appName} installation is up to date`)
  .action(async () => {
    try {
      const res = await fetch("https://raw.githubusercontent.com/LydonDev/KYRO-VERSION/main/VERSION.MD");
      const remoteVersion = (await res.text()).trim();
      const result = compareVersions(localVersion, remoteVersion);

      if (result < 0) {
        console.log(chalk.hex("#a2b3ff")("╭────────────────────────────────────────────╮"));
        console.log(chalk.hex("#a2b3ff")(`│ 🚀 ${appName} Environment                        │`));
        console.log(chalk.hex("#a2b3ff")("│ 🌟 Checking Version                        │"));
        console.log(chalk.hex("#a2b3ff")("│                                            │"));
        console.log(chalk.hex("#a2b3ff")(`│ 🧩 Version: Your version (${localVersion}) is         │`));
        console.log(chalk.hex("#a2b3ff")(`│  outdated. Latest is ${remoteVersion}.                │`));
        console.log(chalk.hex("#a2b3ff")("╰────────────────────────────────────────────╯\n"));
      } else if (result > 0) {
        console.log(chalk.hex("#a2b3ff")("╭────────────────────────────────────────────╮"));
        console.log(chalk.hex("#a2b3ff")(`│ 🚀 ${appName} Environment                        │`));
        console.log(chalk.hex("#a2b3ff")("│ 🌟 Checking Version                        │"));
        console.log(chalk.hex("#a2b3ff")("│                                            │"));
        console.log(chalk.hex("#a2b3ff")(`│ 🧩 Version: You are ahead of the official  │`));
        console.log(chalk.hex("#a2b3ff")(`│  version Current: ${localVersion}, Latest: ${remoteVersion}    │`));
        console.log(chalk.hex("#a2b3ff")("╰────────────────────────────────────────────╯\n"));
      } else {
        console.log(chalk.hex("#a2b3ff")("╭────────────────────────────────────────────╮"));
        console.log(chalk.hex("#a2b3ff")(`│ 🚀 ${appName} Environment                        │`));
        console.log(chalk.hex("#a2b3ff")("│ 🌟 Checking Version                        │"));
        console.log(chalk.hex("#a2b3ff")("│                                            │"));
        console.log(chalk.hex("#a2b3ff")(`│ 🧩 Version: ${localVersion} (Up to date)             │`));
        console.log(chalk.hex("#a2b3ff")("╰────────────────────────────────────────────╯\n"));
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
    const res = await fetch("https://raw.githubusercontent.com/LydonDev/KYRO-VERSION/main/VERSION.MD");
    const remoteVersion = (await res.text()).trim();
    const result = compareVersions(localVersion, remoteVersion);

    const versionLine = chalk.hex("#a2b3ff")(`│ 🧩 Version: ${localVersion}`);
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
  const asciiPath = "/opt/KYRO/kyro/_ascii.txt";
  const ascii = fs.readFileSync(asciiPath, "utf-8");
  const asciiGradient = gradient("FFFFFF", "#a2b3ff");

  console.clear();
  console.log(asciiGradient(ascii));
  console.log(chalk.hex("#a2b3ff")("╭────────────────────────────────────────────╮"));
  console.log(chalk.hex("#a2b3ff")(`│ 🚀 ${appName} Environment                        │`));
  console.log(chalk.hex("#a2b3ff")("│ 🌟 Launching services...                   │"));
  console.log(chalk.hex("#a2b3ff")("│                                            │"));
  console.log(await printVersionStatus());
  console.log(chalk.hex("#a2b3ff")("│                                            │"));
  console.log(chalk.hex("#a2b3ff")("│ 🔌 API:     http://localhost:3000          │"));
  console.log(chalk.hex("#a2b3ff")(`│ 🖥️  ${appName}:   http://localhost:5173           │`));
  console.log(chalk.hex("#a2b3ff")("│ ⚙️  Krypton: http://localhost:8080          │"));
  console.log(chalk.hex("#a2b3ff")("╰────────────────────────────────────────────╯\n"));
};

const formatLogLine = (data: Buffer): string => {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  return data
    .toString()
    .split("\n")
    .filter(Boolean)
    .map((line) => `[${timestamp}] ${line}`)
    .join("\n") + "\n";
};

const spawnWithLogs = (proc: { name: string, cmd: string, args: string[], cwd: string }) => {
  const logPath = path.join(logsDir, `${proc.name.replace(/\s+/g, "_").toLowerCase()}.log`);
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

export const devCommand = new Command("dev")
  .description(`Run ${appName} in development mode`)
  .action(async () => {
    await stopAllServers();

    const processes = [
      { name: `${appName} Backend`, cmd: "bun", args: ["run", "start"], cwd: "/opt/KYRO/kyro" },
      { name: `${appName} Frontend`, cmd: "bun", args: ["run", "dev"], cwd: "/opt/KYRO/kyro/core" },
      { name: "Krypton", cmd: "bun", args: ["run", "start"], cwd: "/opt/KYRO/krypton" },
    ];

    let bannerPrinted = false;

    processes.forEach((proc) => {
      const child = spawnWithLogs(proc);

      if (proc.name === `${appName} Frontend`) {
        child.stdout.on("data", async () => {
          if (!bannerPrinted) {
            bannerPrinted = true;
            await printBanner();
          }
        });

        child.on("close", (code) => {
          if (code !== 0) process.exit(code);
        });
      }
    });
  });

export const prodCommand = new Command("prod")
  .description(`Build and run ${appName} in production`)
  .action(async () => {
    await stopAllServers();

    const processes = [
      { name: `${appName} Backend`, cmd: "bun", args: ["run", "start"], cwd: "/opt/KYRO/kyro" },
      { name: `${appName} Frontend`, cmd: "bun", args: ["run", "build"], cwd: "/opt/KYRO/kyro/core" },
      { name: "Krypton", cmd: "bun", args: ["run", "start"], cwd: "/opt/KYRO/krypton" },
    ];

    processes.forEach((proc) => {
      const child = spawnWithLogs(proc);

      if (proc.name === `${appName} Frontend`) {
        child.stdout.on("data", (data) => {
          console.log(chalk.blue(`[Frontend Build] ${data}`));
        });

        child.stderr.on("data", (data) => {
          console.log(chalk.yellow(`${data}`));
        });

        child.on("close", async (code) => {
          if (code === 0) {
            await printBanner();
          } else {
            console.log(chalk.red(`❌ Frontend build failed with code ${code}`));
            process.exit(code);
          }
        });
      }
    });
  });
