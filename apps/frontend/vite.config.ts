import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  plugins: [react()],
  preview: {
    allowedHosts: true
  },
  server: {
    allowedHosts: true
  }
});
