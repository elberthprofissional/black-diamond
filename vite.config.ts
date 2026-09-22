import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Expose so a launcher / phone on the same network can reach it in dev.
    // No production impact — Vite server is only used during development.
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});