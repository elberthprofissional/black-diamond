import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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