/*
 * Kyro version v1.0.0-dev
 * (c) 2025 - 2025 Lydon
 */

import express from "express";
import { join, resolve } from "path";
import { existsSync, statSync } from "fs";
import { loadRouters } from "./utils/routes_loader";
import { APP_PORT, APP_NAME, KYRO_VERSION } from "./config";

const app = express();
const __dirname = process.cwd();

app.use(express.json());

const routersDir = join(__dirname, "src", "routers");
app.use(loadRouters(routersDir));

app.get("/api/system", (req, res) => {
  res.json({
    name: APP_NAME,
    version: KYRO_VERSION,
    "powered-by": APP_NAME,
  });
});

const frontendPath = resolve(__dirname, "./core/dist");
const indexPath = join(frontendPath, "index.html");

const frontendExists =
  existsSync(frontendPath) && statSync(frontendPath).isDirectory();
const indexExists = existsSync(indexPath) && statSync(indexPath).isFile();

if (frontendExists && indexExists) {
  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return;
    res.sendFile(indexPath);
  });
} else {
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return;
    res.status(404).send(`
      <html>
        <head>
          <title>${APP_NAME} - Frontend Not Found</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #fff;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              line-height: 1.6;
            }
            h1 { color: black; }
            .api-path { background: #f0f0f0; padding: 0.2rem 0.4rem; border-radius: 3px; }
            .info { }
          </style>
        </head>
        <body>
          <h1>Frontend Build Not Found</h1>
          <p class="info">The frontend build directory was not found at ${frontendPath}</p>
          <p>Please ensure you've built the frontend application and the files are in the correct location.</p>
          <p>API routes are still available at <span class="api-path">/api/*</span></p>
          <p>For more information, please refer to the <a href="https://docs.kyro.lol">${APP_NAME} documentation</a>.</p>
          <p>If you need help, please join our <a href="https://discord.gg/compute">Discord server</a>.</p>
          <p><i>${APP_NAME} ${KYRO_VERSION}</i></p>
        </body>
      </html>
    `);
  });
}

app.listen(APP_PORT, () => {
  const serverUrl = `http://localhost:${APP_PORT}`;
  const boxWidth = Math.max(serverUrl.length + 24, 45);
});
