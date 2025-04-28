/*
 * Kyro version v1.0.0-dev
 * (c) 2025 - 2025 Lydon
 */

import express from "express";
import { join } from "path";
import { loadRouters } from "./utils/routes_loader";
import { API_PORT, APP_NAME, KYRO_VERSION } from "./config";

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

app.listen(API_PORT, () => {
  const serverUrl = `http://localhost:${API_PORT}`;
  const boxWidth = Math.max(serverUrl.length + 24, 45);
});
