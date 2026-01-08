/*
 * @Description:
 * @Author: Devin
 * @Date: 2025-12-25 11:52:43
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    outDir: "../../public",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    allowedHosts: true,
  },
});
