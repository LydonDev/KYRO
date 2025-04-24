/*
 * Kyro version v1.0.0-dev (Revenant)
 * (c) 2025 - 2025 Lydon
 */

import express from "express";
import { join, resolve } from "path";
import { existsSync, statSync } from "fs";
import { loadRouters } from "./utils/routes_loader";
import { PORT } from "./config";

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";

const app = express();
const __dirname = process.cwd();

app.use(express.json());

// API routes
const routersDir = join(__dirname, "src", "routers");
app.use(loadRouters(routersDir));

// System API route
app.get("/api/system", (req, res) => {
  res.json({
    name: appName,
    version: "1.0.0",
    "powered-by": appName,
  });
});

// Validate and serve frontend
const frontendPath = resolve(__dirname, "./app/dist");
const indexPath = join(frontendPath, "index.html");

// Check if frontend exists and has the required structure
const frontendExists =
  existsSync(frontendPath) && statSync(frontendPath).isDirectory();
const indexExists = existsSync(indexPath) && statSync(indexPath).isFile();

if (frontendExists && indexExists) {
  // Serve static assets
  app.use(express.static(frontendPath));

  // Serve index.html for client-side routing
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return;
    res.sendFile(indexPath);
  });
} else {
  // Fallback for non-API routes when frontend is missing
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return;
    res.status(404).send(`
      <html>
        <head>
          <title>${appName} - Frontend Not Found</title>
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
          <p>For more information, please refer to the <a href="https://docs.${appName}.lol">${appName} documentation</a>.</p>
          <p>If you need help, please join our <a href="https://discord.gg/compute">Discord server</a>.</p>
          <p><i>${appName} 1.0.0-dev (Revenant)</i></p>
        </body>
      </html>
    `);
  });
}

// Start server
app.listen(PORT, () => {
  // Create a box for startup message
  const serverUrl = `http://localhost:${PORT}`;
  const boxWidth = Math.max(serverUrl.length + 24, 45);
});
