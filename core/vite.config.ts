import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "framer-motion"],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "./index.html"),
      },
    },
  },
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.API_URL || "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
